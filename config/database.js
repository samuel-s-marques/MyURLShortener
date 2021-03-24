const redis 		= require('redis')
const mysql 		= require('mysql')
const client 		= redis.createClient()

client.on('ready', () => {
	console.log('Redis connected.')
})

client.on('error', (error) => {
	console.error(error)
})

var mysql_connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'URLShortener',
	charset: 'utf8'
})

mysql_connection.connect((error) => {
	if (error) {
		console.error('Error while connecting to MySQL database: ' + error)
	}

	var sql = 'SET NAMES utf8'

	mysql_connection.query(sql, (error, result) => {
		if (error) {
			console.error('Error while setting names utf-8.')
		}

		console.log('Names UTF-8 set.')
	})

	console.log('MySQL connected.')

	let create_url_data_table = 'CREATE TABLE IF NOT EXISTS url_data(' + 
		'code VARCHAR(6) NOT NULL PRIMARY KEY, visits INT(11) DEFAULT 0, ' + 
		'created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'

	let create_stats_table = 'CREATE TABLE IF NOT EXISTS stats(code VARCHAR(6) NOT NULL, ' + 
		'user_ip VARCHAR(33), devices VARCHAR(30), system VARCHAR(20), browser VARCHAR(30), ' +
		'language VARCHAR(9), geolocation VARCHAR(9), accessed_at DATE DEFAULT CURDATE(), ' + 
		'FOREIGN KEY (code) REFERENCES url_data(code))'

	mysql_connection.query(create_url_data_table, (err, results) => {
		if (err) throw err;
		console.log('url_data table created.')
	})

	mysql_connection.query(create_stats_table, (err, results) => {
		if (err) throw err;
		console.log('stats table created.')
	})
})

module.exports = {
	mysql_connection: mysql_connection,
	client: client
}