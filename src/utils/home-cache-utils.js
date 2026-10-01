const LoggerError = require("./logger-error");
const redisClient = require("./redis-client");

const cronLocks = {
  home: false,
  mybl: false,
  free: false,
};

const safeJsonParse = (value) => {
  if (value == null || value === "") {
    return undefined;
  }
  if (typeof value === "object") {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch (err) {
    LoggerError.log(err);
    return undefined;
  }
};

const safeRedisGet = async (key) => {
  try {
    return await redisClient.get(key);
  } catch (err) {
    console.error(`Redis get failed for ${key}:`, err);
    LoggerError.log(err);
    return null;
  }
};

const safeRedisSet = async (key, value) => {
  try {
    await redisClient.set(key, value);
    return true;
  } catch (err) {
    console.error(`Redis set failed for ${key}:`, err);
    LoggerError.log(err);
    return false;
  }
};

const unwrapCallResults = (results) => {
  if (!results) {
    return null;
  }
  try {
    return Object.values(JSON.parse(JSON.stringify(results)));
  } catch (err) {
    LoggerError.log(err);
    return null;
  }
};

const safeResultIndex = (jsResult, index) => {
  if (!jsResult || !Array.isArray(jsResult)) {
    return undefined;
  }
  return jsResult[index];
};

const HOME_STATIC_SECTION_EN_NAMES = {
  নতুন: "New Releases",
  ফ্রি: "Free",
  "শীর্ষ ১০": "Top 10",
  ট্রেন্ডিং: "Trending",
  প্রিমিয়াম: "Premium",
  পডকাস্ট: "Podcast",
};

const pushHomeStaticSection = (data, bnName, sectionData, extraFields = {}) => {
  if (sectionData == null) {
    return false;
  }
  data.data.push({
    name: bnName,
    en_name: HOME_STATIC_SECTION_EN_NAMES[bnName] ?? null,
    data: sectionData,
    ...extraFields,
  });
  return true;
};

const safePushPodcast = (data, jsResult1) => {
  const podcast = safeResultIndex(jsResult1, 3);
  return pushHomeStaticSection(data, "পডকাস্ট", podcast);
};

const safePushCategorySection = (data, results3, extraFields = {}) => {
  const jsResult3 = unwrapCallResults(results3);
  if (
    !jsResult3 ||
    !Array.isArray(jsResult3[1]) ||
    jsResult3[1].length === 0 ||
    !jsResult3[0] ||
    !jsResult3[0][0]
  ) {
    return false;
  }
  data.data.push({
    name: jsResult3[0][0].name,
    ...extraFields,
    data: jsResult3[1],
  });
  return true;
};

const loadCategoryIds = async (db) => {
  const sql = `SELECT id FROM categories where forAcademic = 0 order by priority asc`;
  const result = await db.query(sql);
  if (!result) {
    return [];
  }
  return Object.values(JSON.parse(JSON.stringify(result))).map((el) => el.id);
};

const fetchHomeDataFromMysql = async (db, column) => {
  const allowedColumns = ["homeData", "homeDataMybl", "homeDataFree"];
  if (!allowedColumns.includes(column)) {
    return undefined;
  }
  try {
    const sql = `Select ${column} from homepage_data where track_key ="home_data" AND status = 1 AND version = 2`;
    const result = await db.query(sql);
    if (!result || !result[0] || result[0][column] == null) {
      return undefined;
    }
    return safeJsonParse(result[0][column]);
  } catch (err) {
    LoggerError.log(err);
    return undefined;
  }
};

const persistHomeCronData = async ({
  db,
  data,
  mysqlColumn,
  redisKey,
  jobName,
  startedAt,
}) => {
  const durationMs = Date.now() - startedAt;
  const sectionCount = data?.data?.length || 0;

  if (sectionCount === 0) {
    const existing = await safeRedisGet(redisKey);
    console.warn(
      `[home-cron:${jobName}] empty rebuild after ${durationMs}ms; preserving existing cache`
    );
    return {
      ok: true,
      written: false,
      reason: "empty_preserve_existing",
      sectionCount,
      durationMs,
      hadExistingCache: Boolean(existing),
    };
  }

  const payload = JSON.stringify(data);
  let mysqlOk = false;
  let redisOk = false;

  try {
    const sqlSaveHome = `Update homepage_data set ${mysqlColumn} = ? where track_key = "home_data" and status = 1 and version = 2`;
    const resSaveHome = await db.query(sqlSaveHome, [payload]);
    mysqlOk = Boolean(resSaveHome);
  } catch (err) {
    console.error(`[home-cron:${jobName}] MySQL write failed:`, err);
    LoggerError.log(err);
  }

  redisOk = await safeRedisSet(redisKey, payload);

  console.log(
    `[home-cron:${jobName}] completed in ${durationMs}ms sections=${sectionCount} mysql=${mysqlOk} redis=${redisOk}`
  );

  return {
    ok: mysqlOk || redisOk,
    written: true,
    reason: mysqlOk && redisOk ? "full" : "partial",
    sectionCount,
    durationMs,
    mysqlOk,
    redisOk,
  };
};

const runWithCronLock = async (lockName, fn) => {
  if (cronLocks[lockName]) {
    console.warn(`[home-cron:${lockName}] skipped; previous run still in progress`);
    return {
      ok: true,
      written: false,
      reason: "overlap_skipped",
    };
  }

  cronLocks[lockName] = true;
  try {
    return await fn();
  } catch (err) {
    console.error(`[home-cron:${lockName}] unhandled error:`, err);
    LoggerError.log(err);
    return {
      ok: false,
      written: false,
      reason: "error",
    };
  } finally {
    cronLocks[lockName] = false;
  }
};

const logSectionError = (jobName, section, err) => {
  console.error(`[home-cron:${jobName}] ${section} failed:`, err);
  LoggerError.log(err);
};

const isValidHomePayload = (payload) => {
  return Boolean(payload && Array.isArray(payload.data) && payload.data.length > 0);
};

module.exports = {
  safeJsonParse,
  safeRedisGet,
  safeRedisSet,
  unwrapCallResults,
  safeResultIndex,
  safePushPodcast,
  pushHomeStaticSection,
  HOME_STATIC_SECTION_EN_NAMES,
  safePushCategorySection,
  loadCategoryIds,
  fetchHomeDataFromMysql,
  persistHomeCronData,
  runWithCronLock,
  logSectionError,
  isValidHomePayload,
};
