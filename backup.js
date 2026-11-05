
const sqlite3 = require('sqlite3').verbose()

const source = './database.sqlite'
const destination = './database-backup.sqlite'

const db = new sqlite3.Database(source)

db.serialize(() => {
  db.run('PRAGMA busy_timeout = 5000')

  db.run(
    `VACUUM INTO '${destination}'`,
    (error) => {
      if (error) {
        console.error('Backup gagal:', error.message)
      } else {
        console.log('Backup berhasil!')
        console.log('File: database-backup.sqlite')
      }

      db.close()
    }
  )
})
