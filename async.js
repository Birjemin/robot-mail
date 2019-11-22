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
const triviaUrl = 'http://www.lengdou.net/random'
const duUrl = 'https://www.note52.com/api/soul/random'
const bingUrl = 'https://api.no0a.cn/api/bing/0'
const people = JSON.parse(process.env.MAIL_TO)


Promise.all([
  getOneData(oneUrl),
  getTriviaData(triviaUrl),
  getDu(duUrl),
  getBing(bingUrl)
]).then((data, err) => {
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
          data: data[0],
          trivia: data[1],
          du: data[2],
          bing: data[3],
          weather: wetherData
        })
      }).then(res => {
        let str = res.response
        console.log(str + ' ' + cnt.local + ' ' + timestampToDate(parseInt(str.slice(-10))))
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

async function getDu(url) {
  let res = await superagent.get(url)
  res = JSON.parse(res.text)
  return res ? res.title : '清明节，应该回你的学校扫扫墓，因为那里埋葬了你的青春。'
}

async function getBing(url) {
  let res = await superagent.get(url)
  res = JSON.parse(res.text)
  return (res && res.status == 1) ?
  {
    txt: res.bing.copyright.replace('1920x1080', '1366x768'),
    url: res.bing.url,
  } : {
    txt: '历史图片：Chon湖上空的低空云，苏格兰特罗萨克斯 (© Alistair Dick/Alamy)',
    url: "http://s.cn.bing.net/th?id=OHR.SaltireClouds_ZH-CN0002027700_1366x768.jpg&rf=LaDigue_1366x768.jpg&pid=hp"
  }
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

async function getTriviaData(url) {
  let res = await superagent.get(url)
  let $ = cheerio.load(res.text)
  let html = $('#topic_list .media .media-body')
  return {
    txt: html.find('.topic-content').text().trim().split('#', 2)[0],
    url: html.find('.topic-img').find('a img').attr('src').trim(),
  }
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