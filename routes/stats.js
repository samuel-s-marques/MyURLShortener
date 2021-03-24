//	Loading modules
	const express 		= require('express')
	const router 		= express.Router()
	const redis 		= require('redis')
	const request 		= require('request')
	const locale 		= require('locale')
	const mysql 		= require('mysql')
	const moment		= require('moment')

	moment.locale('pt-br')

	var config 			= require('../config/database')
	var mysql_connection= config.mysql_connection
	var client 			= config.client 

//	Routes
	router.get('/:code', (req, res) => {
		var code = req.params.code
		var fullUrl = req.protocol + '://' + req.get('host') + '/' + code
		var sql = "SELECT url_data.visits, url_data.created_at, " + 
			"stats.user_ip, stats.devices, stats.system, stats.browser, stats.language, " + 
			"stats.geolocation, stats.accessed_at FROM url_data INNER JOIN stats ON" + 
			" url_data.code = stats.code WHERE url_data.code = " + mysql.escape(code)

		client.hget('generated_codes', code, (error, url) => {
			if (url) {
				request(url, (errr, response, body) => {
					mysql_connection.query(sql, (error, result) => {
						if (error) throw error;

						var ip_addresses = []
						var devices = []
						var systems = []
						var browsers = []
						var languages = []
						var geolocations = []
						var accessed_at = []

						result.forEach((row) => {
							ip_addresses.push(nullify(row.user_ip))
							browsers.push(nullify(row.browser))
							languages.push(nullify(row.language))
							systems.push(nullify(row.system))
							devices.push(nullify(row.devices))
							geolocations.push(nullify(row.geolocation))
							accessed_at.push(moment(nullify(row.accessed_at)).format('L'))
						})

						devices = devices.filter((elem) => { return elem !== undefined })
						ip_addresses = ip_addresses.filter((elem) => { return elem !== undefined })
						systems = systems.filter((elem) => { return elem !== undefined })
						browsers = browsers.filter((elem) => { return elem !== undefined })
						languages = languages.filter((elem) => { return elem !== undefined })
						geolocations = geolocations.filter((elem) => { return elem !== undefined })
						accessed_at = accessed_at.filter((elem) => { return elem !== undefined })

						data = {
							url: url,
							shortened_url: fullUrl,
							date: result[0].created_at,
							visits: result[0].visits,
							title: get_title(body),
							browser_label: Object.keys(count(browsers)),
							browser_data: Object.values(count(browsers)),
							system_label: Object.keys(count(systems)),
							system_data: Object.values(count(systems)),
							language_label: Object.keys(count(languages)),
							language_data: Object.values(count(languages)),
							accessed_at_label: Object.keys(count(accessed_at)),
							accessed_at_data: Object.values(count(accessed_at)),
							device_label: Object.keys(count(devices)),
							device_data: Object.values(count(devices)),
							geolocation_label: Object.keys(count(geolocations)),
							geolocation_data: Object.values(count(geolocations))
						}

						res.render('stats/stats_page', {data: data})
					})
				})
			} else {
				res.redirect('/error/404')
			}
		})
	})

//	Other
	function get_title(body) {
		let match = body.match('<title.*>([^<]*)<\/title>')
		if (!match || typeof match[1] !== 'string'){
			throw new Error('Unable to parse the title tag.')
		}
		
		return match[1]
	}

	function count(array) {
		quantity = {}

		array.forEach((x) => {quantity[x] = (quantity[x] || 0) + 1})

		return quantity
	}

	function nullify(variable) {
		if (typeof variable == undefined || variable == "null" || variable == null || variable == ""){
			return undefined
		} else {
			return variable
		}
	}

module.exports = router