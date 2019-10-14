'use strict'
require('dotenv').config()
const superagent = require('superagent')
const cheerio = require('cheerio')
const ejs = require('ejs')
const fs = require('fs')
const path = require('path')
const nodemailer = require('nodemailer')

const oneUrl = 'http://wufazhuce.com/'
const weatherUrl = 'https://tianqi.moji.com/weather/china/'
const people = JSON.parse(process.env.MAIL_TO)

getOneData(oneUrl).then((oneData, err) => {
  if (err) {
    return err
  }
  people.forEach(cnt => {
    getWetherData(weatherUrl + cnt.local).then((wetherData, err) => {
      if (err) {
        return err
      }
      sendMail({
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT),
        secure: 'true' === process.env.MAIL_SECURE, // true for 465, false for other ports
        auth: {
          user: process.env.MAIL_USER, // generated ethereal user
          pass: process.env.MAIL_PASS // generated ethereal password
        }}, {
        from: process.env.MAIL_FROM, // sender address
        to: cnt.email, // list of receivers
        subject: process.env.MAIL_SUBJECT, // Subject line
        text: process.env.MAIL_TEXT, // plain text body
        html: getHtml({
          data: oneData,
          weather: wetherData
        })
      }).then(res => {
        let str = res.response
        console.log(str + ' ' + timestampToDate(parseInt(str.slice(-10))))
      })
    })
  })
})

function timestampToDate(timestamp) {
  let date = new Date(timestamp * 1000)
  let m = date.getMonth(),
      d = date.getDate(),
      h = date.getHours(),
      i = date.getMinutes(),
      s = date.getSeconds()
  let month = (m + 1 < 10 ? '0' + (m + 1) : m + 1),
      day = (d < 10 ? '0' + d : d),
      hour = (h < 10 ? '0' + h : h),
      minute = (i < 10 ? '0' + i : i),
      second = (s < 10 ? '0' + s : s)
  return date.getFullYear() + `-${month}-${day} ${hour}:${minute}:${second}`
}

function getHtml(data) {
  let template = ejs.compile(fs.readFileSync(path.resolve(__dirname, "email.ejs"), "utf8"))
  return template(data)
}

async function getOneData(url) {
  let res = await superagent.get(url)
  let $ = cheerio.load(res.text)
  let html = $('#carousel-one .carousel-inner .item')
  let data = []
  html.each(function (i, ele) {
    let imgUrl = $(this).find('a img').attr('src')
    let temp = $(this).children('.fp-one-cita-wrapper')
    data.push({
      url: imgUrl,
      may: temp.find('.fp-one-titulo-pubdate .may').text(),
      dom: temp.find('.fp-one-titulo-pubdate .dom').text(),
      text: temp.find('a').text(),
    })
  })
  return [data[0]]
}

async function getWetherData(url) {
  let res = await superagent.get(url)
  let $ = cheerio.load(res.text)
  let info = $('.wrap .left')
  let weather = info.find('.wea_weather')
  let about = info.find('.wea_about')
  return {
    contry: $('#search .search .search_default').find('em').text(),
    temp: weather.find('em').text().concat('°'),
    weather: weather.find('b').text(),
    humidity: about.find('span').text().replace('湿度 ', ''),
    wind: about.find('em').text(),
    limit: about.find('b').text().replace('尾号限行', ''),
  }
}

async function sendMail(config, data) {
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport(config)
  // send mail with defined transport object
  let res = await transporter.sendMail(data)
  return res
}