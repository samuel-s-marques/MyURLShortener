//	Loading modules
	const express 		= require('express')
	const handlebars	= require('express-handlebars')
	const bodyParser	= require('body-parser')
	const redis 		= require('redis')
	const crypto 		= require('crypto')
	const mysql 		= require('mysql')
	const UAParser 		= require('ua-parser-js')
	const path			= require('path')
	const moment		= require('moment')
	const request 		= require('request')
	const stats 		= require('./routes/stats')

	const app 			= express()

	var config 			= require('./config/database')
	var mysql_connection= config.mysql_connection
	var client 			= config.client 

//	Settings
	//	Body parser
		app.use(bodyParser.urlencoded({extended: true}))
		app.use(bodyParser.json())

	//	Moment
		moment.locale('pt-br')

	//	Handlebars
		app.engine('handlebars', handlebars({defaultLayout: 'main', helpers: {
			section: function(name, options) {
				if(!this._sections) this._sections = {}
				this._sections[name] = options.fn(this)
				return null
			},
			formatDate: (date) => {
				return moment(date).format('L')
			},
			json: (content) => {
				return JSON.stringify(content)
			}
		}}))
		
		app.set('view engine', 'handlebars')

	//	Public
		app.use(express.static(path.join(__dirname, 'public')))

//	Routes
	app.get('/', (req, res) => {
		res.render('index')
	})

	app.post('/', (req, res) => {
		var errors	= []
		var urlData	= []
		var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl

		if (!req.body.url || typeof req.body.url == undefined || req.body.url == null || !req.body.url.startsWith('http')){
			erros.push({texto: 'Invalid URL.'})
		}

		if (errors.length > 0){
			res.render('index', {errors: errors})
		} else {
			var generated_code = generate_random_code(3)
			var sql = "INSERT INTO url_data(code) VALUES(" + mysql.escape(generated_code) + ")"

			client.hmset('generated_codes', generated_code, req.body.url)
			mysql_connection.query(sql, (error, result) => {
				if (error) throw error;
			})

			res.render('index', {url: fullUrl, code: generated_code})
		}
	})

	app.get('/error/404', (req, res, next) => {
		res.render('error/404')
	})

	app.get('/:code', (req, res, next) => {
		var code = req.params.code
		var browser = ensureLatestBrowser(req.headers['user-agent'])
		var os = ensureLatestOS(req.headers['user-agent'])
		var device = ensureLatestDevice(req.headers['user-agent'])
		var get_data_sql = "SELECT * FROM url_data WHERE code = " + mysql.escape(code)

		if(typeof req.headers['accept-language'] != undefined){
			var language = req.headers['accept-language'].substring(0, 2)
		}

		const parseIp = (req) =>
			(typeof req.headers['x-forwarded-for'] === 'string'
				&& req.headers['x-forwarded-for'].split(',').shift())
			|| req.connection?.remoteAddress
			|| req.socket?.remoteAddress
			|| req.connection?.socket?.remoteAddress

		client.hget('generated_codes', code, (error, result) => {
			if (result) {
				mysql_connection.query(get_data_sql, (mysql_error, mysql_result) => {
					if (mysql_error) throw mysql_error;

					var visits = mysql_result[0].visits
					var update_visits = "UPDATE url_data SET visits = " + mysql.escape(visits + 1) + " WHERE code = " + mysql.escape(code)

					mysql_connection.query(update_visits, (updated_mysql_error, updated_mysql_result) => {
						if (updated_mysql_error) throw updated_mysql_error;
					})

					request('http://ipwhois.app/json/' + parseIp(req), {json: true}, (err, res, body) => {
						if (err) { console.error(err) };

						var geolocation = body.country_code

						var insert_stats = "INSERT INTO stats(code, user_ip, devices, system, browser, language, geolocation) VALUES(" + 
							mysql.escape(code) + ", " + mysql.escape(parseIp(req)) + ", " + mysql.escape(device) + ", " + mysql.escape(os) + ", " + 
							mysql.escape(browser) + ", " + mysql.escape(language) + ", " + mysql.escape(geolocation) + ")"
					
						mysql_connection.query(insert_stats, (insert_stats_error, insert_stats_result) => {
							if (insert_stats_error) throw insert_stats_error;
						})
					})
				})

				res.redirect(result)
			} else {
				res.redirect('/error/404')
			}
		})
	})

	app.use('/stats', stats)

//	Other
	function generate_random_code(length) {
		var code = crypto.randomBytes(length).toString('hex')

		return code
	}

	function ensureLatestBrowser(user_agent) {
		var parser 	= new UAParser()
		var browserName = parser.setUA(user_agent).getBrowser().name

		return browserName
	}

	function ensureLatestDevice(user_agent) {
		var parser = new UAParser()
		var deviceType = parser.setUA(user_agent).getDevice().type

		return deviceType
	}

	function ensureLatestOS(user_agent){
		var parser = new UAParser()
		var os = parser.setUA(user_agent).getOS()

		return (os.name + " " + os.version)
	}

	const PORT = 8080
	app.listen(PORT, '0.0.0.0', () => {
		console.log('Server is now running on localhost:8080')
	})