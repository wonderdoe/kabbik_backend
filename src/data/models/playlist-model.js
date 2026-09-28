const DB = require('../db');
const LoggerError = require('../../utils/logger-error');

class PlaylistModel {
    folders_table = "playlist_folders";
    books_table="playlist_books"

    createFolder=async(user_id,folder_name,desc)=>{
        try{
            const insertSql = `
              INSERT INTO ${this.folders_table} (user_id, folder_name,description)
                SELECT ?, ?,?
                WHERE (
                    SELECT COUNT(*) FROM ${this.folders_table} WHERE user_id = ?
                ) < 30;
            `;
            const result = await DB.query(insertSql, [
              user_id,
              folder_name,
              desc,
              user_id
            ]);

            return {success:true,data:result}
        }catch(e){
            console.log(e)
            return {success:false,message:"insertion failed"}
        }
    }

    addBooksToPlaylist=async(audiobook_id,folders_id,user_id)=>{
        try{
            const insertSql = `
              INSERT INTO ${this.books_table} (audiobook_id, folders_id) 
              select ?, ? 
                where (
                    select count(*)
                    from ${this.books_table} b
                    join ${this.folders_table} f on f.id=b.folders_id
                    where f.user_id=?
                ) < 150 and (select user_id from ${this.folders_table} where id=?)=?
            `;
            const result = await DB.query(insertSql, [
              audiobook_id,
              folders_id,
              user_id,
              folders_id,
              user_id
            ]);

             return {success:true,data:result}
        }catch(e){
            console.log(e)
            return {success:false,message:"updation failed"}
        }
    }

    deleteBookFromPlayList=async(bookInPlayListId,user_id)=>{
        try{
            if(!bookInPlayListId)return;
            let deletesql=`delete b from ${this.books_table} as b
            join ${this.folders_table} as f 
            on f.id=b.folders_id
            where b.id=? and f.user_id=?`
            const result = await DB.query(deletesql, [
              bookInPlayListId,user_id
            ]);
            return {success:true,data:result}
        }catch(e){
            console.log(e)
            return {success:false,message:"deletion failed"}
        }
    }

    editFoldersName=async(id,folder_name,user_id)=>{
        try{
            if(!id || !folder_name)return;
            let deletesql=`update ${this.folders_table}
                set folder_name = ?
                where id=? and user_id=?
            `
            const result = await DB.query(deletesql, [
              folder_name,
              id,
              user_id
            ]);
            return {success:true,data:result}
        }catch(e){
            console.log(e)
            return {success:false,message:"deletion failed"}
        }
    }

     getAllBooksOfSingleUser=async(user_id)=>{
        try{
            if(!user_id )return;

            let sql=`select f.id as folder_id,f.folder_name as folder_name,b.created_at as created_at, b.audiobook_id as audiobook_id
             ,b.id as playlist_book_id,ab.name,ab.play_count,ab.total_duration, ab.en_name, ab.author_name,ab.en_author_name, ab.banner_path, ab.thumb_path 
            from ${this.folders_table} as f
                left join ${this.books_table} as b on
                f.id = b.folders_id
                left join audiobooks as ab on ab.id=b.audiobook_id 
                where f.user_id=?
            `
            const result = await DB.query(sql, [
              user_id
            ]);

            const totals = result?.reduce(
                (acc, item) => {
                  acc.totalPlayCount += Number(item.play_count || 0);
                  acc.totalDuration += Number(item.total_duration || 0);
                  return acc;
                },
                { totalPlayCount: 0, totalDuration: 0 }
              );

            return {success:true,data:result,meta:{
                totalPlayCount:totals?.totalPlayCount,
                totalDuration:Math.ceil(totals?.totalDuration||0)
            }}
        }catch(e){
            console.log(e)
            return {success:false,message:"something went wrong"}
        }
    }

    getAllBooksOfSingleUserNew=async(user_id)=>{
        try{
            if(!user_id )return;

            let sql=`select f.id as folder_id,f.folder_name as folder_name,f.description , b.created_at as created_at, b.audiobook_id as audiobook_id
             ,b.id as playlist_book_id,ab.name,ab.play_count,ab.total_duration, ab.en_name, ab.author_name,ab.en_author_name, ab.banner_path, ab.thumb_path 
            from ${this.folders_table} as f
                left join ${this.books_table} as b on
                f.id = b.folders_id
                left join audiobooks as ab on ab.id=b.audiobook_id 
                where f.user_id=?
                order by f.created_at desc
            `
            const result = await DB.query(sql, [
              user_id
            ]);

            const totals = result?.reduce(
                (acc, item) => {
                  acc.totalPlayCount += Number(item.play_count || 0);
                  acc.totalDuration += Number(item.total_duration || 0) 
                  ;
                  return acc;
                },
                { totalPlayCount: 0, totalDuration: 0 }
              );

              const data = Object.values(
                (result ?? []).reduce((acc, row) => {
                  const key = row.folder_name;
              
                  if (!acc[key]) {
                    acc[key] = {
                      folder_name: row.folder_name,
                      description: row.description,
                      playCount: 0,
                      totalDuration: 0,
                      items: []
                    };
                  }
              
                  acc[key].playCount += Number(row.play_count || 0);
                  acc[key].totalDuration += Number(row.total_duration || 0);
                  acc[key].folder_id = row.folder_id;
                  
                  if(row?.audiobook_id){
                      acc[key].items.push({
                        // folder_id: row.folder_id,
                        created_at: row.created_at,
                        audiobook_id: row.audiobook_id,
                        playlist_book_id: row.playlist_book_id,
                        name: row.name,
                        play_count: row.play_count,
                        total_duration: row.total_duration,
                        en_name: row.en_name,
                        author_name: row.author_name,
                        en_author_name: row.en_author_name,
                        banner_path: row.banner_path,
                        thumb_path: row.thumb_path
                      });
                  }
                  
              
                  return acc;
                }, {})
              );

            return {success:true,data:data,meta:{
                totalPlayCount:totals?.totalPlayCount,
                totalDuration:Math.ceil(totals?.totalDuration||0)
            }}
        }catch(e){
            console.log(e)
            return {success:false,message:"something went wrong"}
        }
    }
}

module.exports = new PlaylistModel;