## 每日一句

### 目的
一个小脚本，主要是获取当日天气和当天的“鸡汤”。。。

![截图](shot.png)

###  使用姿势

1. 安装npm依赖

2. 配置`.env`文件
```
cp .env.example .env
```

3. mac系统下，使用crontab每天9时50分给自己发送鸡汤

```
50 9 * * * cd /Users/birjemin/Developer/Node/robot-mail;/Users/birjemin/.nvm/versions/node/v10.16.0/bin/node async.js >> /Users/birjemin/Downloads/crontab.txt
```