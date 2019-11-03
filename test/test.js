var express = require('express');
var app = express();
var client_id = '3hz9dJ1yFVeXaQbtXqbB';//개발자센터에서 발급받은 Client ID
var client_secret = 'fWiCb8lpZH'; //개발자센터에서 발급받은 Client Secret
var query = "반갑습니다.";           // 번역할 문장
app.get('/translate', function (req, res) {
    var api_url = 'https://openapi.naver.com/v1/language/translate';
    var request = require('request');
    var options = {
        url: api_url,
        form: {'source':'ko', 'target':'en', 'text':query}, 
        headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
    };
    request.post(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {         //에러없을 때 출력
            res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
            console.log(response);
            res.end(body);
        } else {    //에러시 출력
            res.status(response.statusCode).end();
            console.log('error = ' + response.statusCode);
        }
    });
});
app.listen(3000, function () {
    console.log('http://127.0.0.1:3000/translate app listening on port 3000!');
});