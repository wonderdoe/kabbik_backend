function dailySignupSubscriptionReportTemplate({ signups, packageStats, reportDate }) {
    const signupRows = Array.isArray(signups?.[0]) ? signups[0] : (Array.isArray(signups) ? signups : []);
    const packageStatRows = Array.isArray(packageStats?.[0]) ? packageStats[0] : (Array.isArray(packageStats) ? packageStats : []);

    const totalSignups = signupRows.reduce((sum, row) => sum + (Number(row.signup_count) || 0), 0);
    const totalSubscriptionsYesterday = packageStatRows.reduce((sum, row) => sum + (Number(row.sub_yesterday) || 0), 0);
    const totalUnsubscriptionsYesterday = packageStatRows.reduce((sum, row) => sum + (Number(row.unsub_yesterday) || 0), 0);
    const totalMonthlySubscriptions = packageStatRows.reduce((sum, row) => sum + (Number(row.sub_last_30_days) || 0), 0);
    const totalMonthlyUnsubscriptions = packageStatRows.reduce((sum, row) => sum + (Number(row.unsub_last_30_days) || 0), 0);
    const totalWeeklySubscriptions = packageStatRows.reduce((sum, row) => sum + (Number(row.sub_last_7_days) || 0), 0);
    const totalWeeklyUnsubscriptions = packageStatRows.reduce((sum, row) => sum + (Number(row.unsub_last_7_days) || 0), 0);
    const now = new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' });

    const formatCount = (value) => (Number(value) || 0).toLocaleString('en-US');

    const tableCardStyle = 'border:1px solid #e8ecf1;border-radius:10px;overflow:hidden;background-color:#ffffff;';
    const tableStyle = 'width:100%;border-collapse:collapse;font-size:14px;font-family:Arial,sans-serif;';
    const tableHeaderStyle = 'background-color:#1a73e8;color:#ffffff;padding:12px 14px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.7px;border:none;text-align:left;';
    const tableHeaderCountStyle = `${tableHeaderStyle}text-align:right;`;
    const rowBg = (index) => (index % 2 === 0 ? '#ffffff' : '#f9fafb');
    const tableCellStyle = (bg) => `padding:12px 14px;border-bottom:1px solid #eef1f5;background-color:${bg};vertical-align:middle;color:#2d3748;`;
    const tableCellCountStyle = (bg) => `${tableCellStyle(bg)}text-align:right;white-space:nowrap;`;
    const badgeStyle = 'display:inline-block;padding:5px 12px;border-radius:20px;background-color:#eef4fd;color:#1a56c4;font-size:12px;font-weight:600;letter-spacing:0.2px;';
    const packagePillSubStyle = 'display:inline-block;min-width:28px;padding:4px 6px;border-radius:6px;background-color:#e8f5e9;color:#2e7d32;font-size:12px;font-weight:700;text-align:center;';
    const packagePillUnsubStyle = 'display:inline-block;min-width:28px;padding:4px 6px;border-radius:6px;background-color:#ffebee;color:#c62828;font-size:12px;font-weight:700;text-align:center;';
    const packageNameStyleCompact = 'display:inline-block;font-size:12px;font-weight:600;color:#2d3748;line-height:1.3;';
    const pillNeutralStyle = 'display:inline-block;min-width:42px;padding:5px 10px;border-radius:8px;background-color:#edf2f7;color:#2d3748;font-size:13px;font-weight:700;text-align:center;';
    const packageCellStyle = (bg) => `padding:10px 8px;border-bottom:1px solid #eef1f5;background-color:${bg};vertical-align:middle;color:#2d3748;`;
    const packageCellCountStyle = (bg) => `${packageCellStyle(bg)}text-align:center;white-space:nowrap;width:22%;`;
    const packageHeaderStyle = `${tableHeaderStyle}width:56%;`;
    const packageHeaderCountStyle = `${tableHeaderCountStyle}text-align:center;width:22%;`;
    const noDataStyle = 'text-align:center;color:#94a3b8;font-style:italic;padding:24px 14px;background-color:#f9fafb;border-bottom:none;';

    const renderSignupRows = signupRows.length
        ? signupRows.map((row, index) => {
            const bg = rowBg(index);
            return `
            <tr>
                <td bgcolor="${bg}" style="${tableCellStyle(bg)}">
                    <span style="${badgeStyle}">${row.auth_src || '-'}</span>
                </td>
                <td bgcolor="${bg}" style="${tableCellCountStyle(bg)}">
                    <span style="${pillNeutralStyle}">${formatCount(row.signup_count)}</span>
                </td>
            </tr>
        `;
        }).join('')
        : `
            <tr>
                <td colspan="2" bgcolor="#f9fafb" style="${noDataStyle}">No signup data for yesterday</td>
            </tr>
        `;

    const renderPackageStatsRows = packageStatRows.length
        ? packageStatRows.map((row, index) => {
            const bg = rowBg(index);
            return `
            <tr>
                <td bgcolor="${bg}" style="${packageCellStyle(bg)}">
                    <span style="${packageNameStyleCompact}">${row.package_name}</span>
                </td>
                <td bgcolor="${bg}" style="${packageCellCountStyle(bg)}">
                    <span style="${packagePillSubStyle}">${formatCount(row.sub_yesterday)}</span>
                </td>
                <td bgcolor="${bg}" style="${packageCellCountStyle(bg)}">
                    <span style="${packagePillUnsubStyle}">${formatCount(row.unsub_yesterday)}</span>
                </td>
            </tr>
        `;
        }).join('')
        : `
            <tr>
                <td colspan="3" bgcolor="#f9fafb" style="${noDataStyle}">No package data for yesterday</td>
            </tr>
        `;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Signup and Subscription Report</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background-color: #f0f2f5; color: #333; -webkit-text-size-adjust: 100%; }
        .wrapper { width: 100%; max-width: 700px; margin: 24px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1a73e8, #0d47a1); padding: 24px; text-align: center; }
        .header h1 { color: #fff; font-size: 20px; font-weight: 700; }
        .header p { color: rgba(255,255,255,0.82); font-size: 13px; margin-top: 6px; }
        .summary-wrap { padding: 16px 20px; background: #f8f9fb; }
        .summary-table { width: 100%; border-collapse: separate; border-spacing: 10px; }
        .summary-card { background: #fff; border-radius: 8px; padding: 16px; text-align: center; border-top: 4px solid #ccc; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .summary-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; margin-bottom: 8px; }
        .summary-card .value { font-size: 28px; font-weight: 700; }
        .summary-card.signups { border-color: #1a73e8; }
        .summary-card.signups .value { color: #1a73e8; }
        .summary-card.subscriptions { border-color: #009a44; }
        .summary-card.subscriptions .value { color: #009a44; }
        .summary-card.unsubscriptions { border-color: #e53935; }
        .summary-card.unsubscriptions .value { color: #e53935; }
        .section { padding: 16px 20px 20px; }
        .section h2 {
            font-size: 12px;
            font-weight: 700;
            color: #4a5568;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.9px;
            padding-left: 2px;
        }
        .table-card {
            border: 1px solid #e8ecf1;
            border-radius: 10px;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .breakdown { width: 100%; border-collapse: collapse; font-size: 14px; }
        .breakdown thead tr { background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%); }
        .breakdown th {
            text-align: left;
            padding: 12px 14px;
            color: #fff;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.7px;
            border: none;
        }
        .breakdown th.col-count { text-align: right; }
        .breakdown td {
            padding: 12px 14px;
            border-bottom: 1px solid #eef1f5;
            vertical-align: middle;
        }
        .breakdown tbody tr:last-child td { border-bottom: none; }
        .breakdown .row-even td { background: #fff; }
        .breakdown .row-odd td { background: #f9fafb; }
        .cell-label { color: #2d3748; font-weight: 500; }
        .cell-count { text-align: right; white-space: nowrap; }
        .source-badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            background: #eef4fd;
            color: #1a56c4;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.2px;
        }
        .package-name {
            display: inline-block;
            font-size: 13px;
            font-weight: 600;
            color: #2d3748;
        }
        .count-pill {
            display: inline-block;
            min-width: 42px;
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 700;
            text-align: center;
        }
        .count-neutral { background: #edf2f7; color: #2d3748; }
        .count-sub { background: #e8f5e9; color: #2e7d32; }
        .count-unsub { background: #ffebee; color: #c62828; }
        .no-data {
            text-align: center;
            color: #94a3b8;
            font-style: italic;
            padding: 24px 14px !important;
            background: #f9fafb !important;
        }
        .footer { background: #f8f9fb; text-align: center; padding: 16px 20px; border-top: 1px solid #eee; }
        .footer p { font-size: 12px; color: #888; }
        @media only screen and (max-width: 480px) {
            .wrapper { margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
            .summary-table, .summary-table tbody, .summary-table tr, .summary-table td { display: block !important; width: 100% !important; }
            .summary-table { border-spacing: 0 !important; }
            .summary-card { margin-bottom: 8px !important; }
            .summary-card .value { font-size: 24px !important; }
            .breakdown td, .breakdown th { padding: 8px 6px !important; font-size: 11px !important; }
            .source-badge, .count-pill { font-size: 11px !important; padding: 4px 8px !important; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>Daily Signup & Subscription Report</h1>
            <p>Report Date: ${reportDate || '-'} | Generated on ${now} (BD Time)</p>
        </div>

        <div class="summary-wrap">
            <table class="summary-table">
                <tr>
                    <td class="summary-card signups">
                        <div class="label">Total Signups</div>
                        <div class="value">${totalSignups}</div>
                    </td>
                    <td class="summary-card subscriptions">
                        <div class="label">Yesterday Subscriptions</div>
                        <div class="value">${totalSubscriptionsYesterday}</div>
                    </td>
                    <td class="summary-card unsubscriptions">
                        <div class="label">Yesterday Unsubscriptions</div>
                        <div class="value">${totalUnsubscriptionsYesterday}</div>
                    </td>
                </tr>
            </table>
        </div>

        <div class="section">
            <h2>Signup by Auth Source</h2>
            <div class="table-card" style="${tableCardStyle}">
                <table class="breakdown" style="${tableStyle}">
                    <thead>
                        <tr>
                            <th bgcolor="#1a73e8" style="${tableHeaderStyle}">Auth Source</th>
                            <th bgcolor="#1a73e8" style="${tableHeaderCountStyle}">Signup Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderSignupRows}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="section">
            <h2>Package Stats (Yesterday)</h2>
            <div class="table-card" style="${tableCardStyle}">
                <table class="breakdown" style="${tableStyle}table-layout:fixed;">
                    <thead>
                        <tr>
                            <th bgcolor="#1a73e8" style="${packageHeaderStyle}">Pack</th>
                            <th bgcolor="#1a73e8" style="${packageHeaderCountStyle}">Sub</th>
                            <th bgcolor="#1a73e8" style="${packageHeaderCountStyle}">Unsub</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderPackageStatsRows}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="summary-wrap">
            <table class="summary-table">
                <tr>
                    <td class="summary-card subscriptions">
                        <div class="label">Monthly Total Subscriptions</div>
                        <div class="value">${totalMonthlySubscriptions}</div>
                    </td>
                    <td class="summary-card unsubscriptions">
                        <div class="label">Monthly Total Unsubscriptions</div>
                        <div class="value">${totalMonthlyUnsubscriptions}</div>
                    </td>
                </tr>
                <tr>
                    <td class="summary-card subscriptions">
                        <div class="label">Weekly Total Subscriptions</div>
                        <div class="value">${totalWeeklySubscriptions}</div>
                    </td>
                    <td class="summary-card unsubscriptions">
                        <div class="label">Weekly Total Unsubscriptions</div>
                        <div class="value">${totalWeeklyUnsubscriptions}</div>
                    </td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p><strong>&#169; ${new Date().getFullYear()} kabbik.com</strong> &middot; Automated report &mdash; please do not reply.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
}

module.exports = { dailySignupSubscriptionReportTemplate };