const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const coreUtils = require('../../utils/core-utils');

class ChannelModel {
    tableName = 'channels';

    getAll = async () => {
        const sql = 'CALL get_entities(?)'
        try {
            const results = await DB.query(sql, [this.tableName])
            if (results) {
                return results[0]
            }
            return undefined
        }
        catch (e) {
            LoggerError.log(e)
            return undefined
        }
    }

    getByPublisherId = async (
        publisherId
    ) => {
        const sql = 'CALL get_channel_by_publisher(?)'
        try {
            const results = await DB.query(sql, [publisherId])
            if (results) {
                // sp returns extra data, need the first one
                return results[0]
            }
            return undefined
        }
        catch (e) {
            LoggerError.log(e)
            return undefined
        }
    }

    findById = async (id) => {
        const sql = 'CALL get_entity_by_id(?, ?)';
        try {
            const results = await DB.query(sql, [id, this.tableName]);
            if (results) {
                // sp returns extra data, need the first one
                return results[0][0];
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    getByAdminId = async (id) => {
        const sql = 'CALL get_entity_by_id(?, ?)';
        try {
            const results = await DB.query(sql, [id, 'users']);
            if (results) {
                // sp returns extra data, need the first one
                return results[0][0];
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    create = async (
        name,
        imageUrl,
        publisherId
    ) => {
        const sql = 'CALL create_channel(?, ?, ?)';
        try {
            const results = await DB.query(sql, [name, imageUrl, publisherId]);
            if (results) {
                const lastId = coreUtils.getValueForKey(results[0][0])
                //console.log(lastId)
                return lastId
            }
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    createForAdmin = async (
        name,
        imageUrl,
        publisherId
    ) => {
        const sql = 'CALL create_channel_for_admin(?, ?, ?)';
        try {
            const results = await DB.query(sql, [name, imageUrl, publisherId]);
            if (results) {
                const lastId = coreUtils.getValueForKey(results[0][0])
                //console.log(lastId)
                return lastId
            }
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    update = async (
        name,
        imageUrl,
        id
    ) => {
        try {
            if (imageUrl == null) {
                const sql = 'CALL update_channel_no_image(?, ?)'
                const result = await DB.query(sql, [name, id]);
                if (result) {
                    return result
                }
            } else {
                const sql = 'CALL update_channel(?, ?, ?)';
                const result = await DB.query(sql, [name, imageUrl, id]);
                if (result) {
                    return result
                }
            }
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    delete = async (id) => {
        const sql = 'CALL delete_entity_soft(?, ?)';
        try {
            const results = await DB.query(sql, [id, this.tableName]);
            if (results) {
                // sp returns extra data 2d array, need the first one
                return results[0][0];
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }
}

module.exports = new ChannelModel;