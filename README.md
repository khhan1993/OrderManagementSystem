# Order Management System (주문관리시스템)

"Order Management System (주문관리시스템)" 은 (일반적으로) 대학교 축제 주점 운영시 사용하는 종이 주문서의 불편함을 해소하기 위해 제작된 시스템입니다.
제작 당시에는 GitHub 소스 공개를 고려하지 않아 여러가지로 사용하기 불편할 수도 있습니다.

### Prerequisite
  - Node.JS (최소 버전 : 4.x)
  - SSL Certificate (HTTPS 운영 고려 시)
  - MySQL DB Server (5.7 권장)

### Installation Web Server
```sh
$ git clone https://github.com/khhan1993/OrderManagementSystem.git
$ cd OrderManagementSystem
$ npm install
```

### Installation Database
  - 사용자 계정과 Database를 생성합니다.
  - 생성한 Database에는 'OrderManagementSystem.sql' 파일을 import 합니다.

### Before start
  - app.js 를 엽니다.
  - 13번째 줄 부터 18번째 줄의 내용은 다음과 같습니다.
```js
var db_connection = mysql.createConnection({
  host     : '127.0.0.1',
  user     : 'OrderManagementSystem',
  password : 'doFG2AOcYWPKZMRQ',
  database : 'OrderManagementSystem'
});
```
  - 이 내용을 자신의 Database 서버에 맞는 값으로 바꿔주면 됩니다.
  - bin/www 를 엽니다. (내용은 다음과 같습니다.)
```js
  var httpPort = normalizePort('3080');
```
  - bin/www 의 55번째 줄에서 사용하고자 하는 포트를 지정합니다.
  - HTTPS 사용을 고려할 경우 다음 절차를 진행하시면 됩니다.
```txt
app.js 의 34번째 줄 부터 39번째 줄에 해당하는 코드 주석 제거.
bin/www 의 21, 22, 46 ~ 49, 56, 62 ~ 64 번째 줄에 해당하는 코드 주석 제거.
bin/www 의 56번째 줄에서 사용하고자 하는 포트를 지정합니다.
```

### Start 'OrderManagementSystem' web server
  - 아래 코드를 'OrderManagementSystem' directory 에서 입력합니다.
```sh
$ npm start
```

## TODO
  - 본 프로젝트는 더 이상의 업데이트가 없을 예졍이며, 새로운 버전의 주문관리시스템을 제작 중입니다.

## License
  - MIT License for only this project.
