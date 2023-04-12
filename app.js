const express = require('express');
const request = require('request');
const xml2js = require('xml2js');
const app = express();
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3000;
const token = 'abcdefg'; // 将 your_token 替换为你自己的 token

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 验证服务器地址的有效性
app.get('/', (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;
  const sha1 = require('crypto').createHash('sha1');
  const str = [token, timestamp, nonce].sort().join('');
  sha1.update(str);
  const result = sha1.digest('hex');
  if (result === signature) {
    res.send(echostr);
  } else {
    res.send('Invalid request');
  }
});

// 处理微信公众号菜单事件的回调
app.post('/wechat', (req, res) => {
  xml2js.parseString(req.body, { explicitArray: false }, (err, json) => {
    if (err) {
      res.send('Invalid request');
      return;
    }
    const { ToUserName, FromUserName, MsgType, Event, EventKey } = json.xml;
    if (MsgType === 'event' && Event === 'CLICK') {
      switch (EventKey) {
        case 'menu_item_1':
          // 用户点击了菜单项1，回复文本消息
          const reply = {
            xml: {
              ToUserName: FromUserName,
              FromUserName: ToUserName,
              CreateTime: Date.now(),
              MsgType: 'text',
              Content: '这是菜单项1的内容'
            }
          };
          const builder = new xml2js.Builder();
          const xml = builder.buildObject(reply);
          res.send(xml);
          break;
        case 'menu_item_2':
          // 用户点击了菜单项2，回复图文消息
          const reply2 = {
            xml: {
              ToUserName: FromUserName,
              FromUserName: ToUserName,
              CreateTime: Date.now(),
              MsgType: 'news',
              ArticleCount: 1,
              Articles: {
                item: {
                  Title: '这是菜单项2的标题',
                  Description: '这是菜单项2的描述',
                  PicUrl: 'http://your-pic-url.com',
                  Url: 'http://your-article-url.com'
                }
              }
            }
          };
          const xml2 = builder.buildObject(reply2);
          res.send(xml2);
          break;
        default:
          res.send('Invalid request');
          break;
      }
    } else {
      res.send('Invalid request');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// 填写你的公众号 appID 和 appSecret
const appID = 'wxff7a58ea8fe7894e';
const appSecret = '47e50709aa82a2814edfc8caa0b88973';

// 微信公众号菜单接口地址
const menuUrl = `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=`;

// 获取 access_token 的接口地址
const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appID}&secret=${appSecret}`;
const baseUrl = "https://1bab1162.r10.cpolar.top";
// 定义菜单配置
const menuConfig = {
  "button": [
    {
      "type": "view",
      "name": "主页网站",
      "url": `${baseUrl}/home`
    },
    {
      "name": "主页菜单1",
      "sub_button": [
        
        {
          "type": "view",
          "name": "Home0222",
          "url": `${baseUrl}/home`
        },
        {
          "type": "view",
          "name": "Home122",
          "url": `${baseUrl}/home`
        }
      ]
    }
  ]
};

// 发起获取 access_token 请求
function getToken(callback) {
  request(tokenUrl, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const token = JSON.parse(body).access_token;
      callback(token);
      console.log('toke:', token);
    } else {
      console.error('获取 access_token 失败', error);
    }
  });
}

// 发起创建菜单请求
function createMenu(token) {
  const url = `${menuUrl}${token}`;
  request.post({
    url: url,
    json: true,
    body: menuConfig
  }, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      console.log('菜单创建成功', body);
    } else {
      console.error('菜单创建失败', error);
    }
  });
}

// 监听菜单创建请求
app.get('/menu/create', (req, res) => {
  getToken(createMenu);
  res.send('创建菜单请求已发送');
});


const fs = require('fs');

app.get('/home', (req, res) => {
  // res.send('hello world!')
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  res.send(html);
});


const crypto = require('crypto');

// 获取 access_token 和 jsapi_ticket
function getWxConfig(callback) {
  const apiURL = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appID}&secret=${appSecret}`;
  request.get(apiURL, function (error, response, body) {
    if (error) {
      console.error(error);
      return;
    }
    const accessToken = JSON.parse(body).access_token;
    const ticketURL = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?type=jsapi&access_token=${accessToken}`;
    request.get(ticketURL, function (error, response, body) {
      if (error) {
        console.error(error);
        return;
      }
      const jsapiTicket = JSON.parse(body).ticket;
      callback(jsapiTicket);
    });
  });
}

// 生成签名
function getSignature(jsapiTicket, url) {
  const nonceStr = Math.random().toString(36).substr(2, 15);
  const timestamp = parseInt(new Date().getTime() / 1000) + '';
  const str = `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  const signature = crypto.createHash('sha1').update(str).digest('hex');
  console.log(`signature ${signature} timestamp ${timestamp} appID ${appID} nonceStr ${nonceStr} url ${url}`);
  return {
    appId: appID, // 替换成实际的 appId
    timestamp: timestamp,
    nonceStr: nonceStr,
    signature: signature
  };
}

// 处理 /wechat/config 请求，返回用于配置 wx.config 的参数 config
app.get('/wechat/config', function (req, res) {
  const url = req.query.url; // 前端页面传递的当前网页的 URL
  getWxConfig(function (jsapiTicket) {
    const config = getSignature(jsapiTicket, url);
    res.json(config);
  });
});