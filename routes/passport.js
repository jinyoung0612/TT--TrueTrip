var express = require('express');
var router = express.Router();
var mongoose=require("mongoose");
var User=mongoose.model('users');
var Planner=mongoose.model('planners');
var passport = require('passport');


var LocalStrategy = require('passport-local').Strategy;

//패스포트 로그인 설정
passport.use('local-login', new LocalStrategy({
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true   // 이 옵션을 설정하면 아래 콜백 함수의 첫번째 파라미터로 req 객체 전달됨
}, function(req, email, password, done) {
    console.log('passport의 local-login 호출됨 : ' + email + ', ' + password);

    var database = app.get('database');
    database.UserModel.findOne({ 'email' :  email }, function(err, user) {
        if (err) { return done(err); }

        // 등록된 사용자가 없는 경우
        if (!user) {
            console.log('계정이 일치하지 않음.');
            return done(null, false, req.flash('loginMessage', '등록된 계정이 없습니다.'));  // 검증 콜백에서 두 번째 파라미터의 값을 false로 하여 인증 실패한 것으로 처리
        }

        // 비밀번호 비교하여 맞지 않는 경우
        var authenticated = user.authenticate(password, user._doc.salt, user._doc.hashed_password);
        if (!authenticated) {
            console.log('비밀번호 일치하지 않음.');
            return done(null, false, req.flash('loginMessage', '비밀번호가 일치하지 않습니다.'));  // 검증 콜백에서 두 번째 파라미터의 값을 false로 하여 인증 실패한 것으로 처리
        }

        // 정상인 경우
        console.log('계정과 비밀번호가 일치함.');
        return done(null, user);  // 검증 콜백에서 두 번째 파라미터의 값을 user 객체로 넣어 인증 성공한 것으로 처리
    });

}));


// 패스포트 회원가입 설정
passport.use('local-signup', new LocalStrategy({
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true    // 이 옵션을 설정하면 아래 콜백 함수의 첫번째 파라미터로 req 객체 전달됨
}, function(req, email, password, done) {
    // 요청 파라미터 중 name 파라미터 확인
    var paramName = req.body.name || req.query.name;

    console.log('passport의 local-signup 호출됨 : ' + email + ', ' + password + ', ' + paramName);

    // findOne 메소드가 blocking되지 않도록 하고 싶은 경우, async 방식으로 변경
    process.nextTick(function() {
        var database = app.get('database');
        database.UserModel.findOne({ 'email' :  email }, function(err, user) {
            // 에러 발생 시
            if (err) {
                return done(err);
            }

            // 기존에 사용자 정보가 있는 경우
            if (user) {
                console.log('기존에 계정이 있음.');
                return done(null, false, req.flash('signupMessage', '계정이 이미 있습니다.'));  // 검증 콜백에서 두 번째 파라미터의 값을 false로 하여 인증 실패한 것으로 처리
            } else {
                // 모델 인스턴스 객체 만들어 저장
                var user = new database.UserModel({'email':email, 'password':password, 'name':paramName});
                user.save(function(err) {
                    if (err) {
                        throw err;
                    }

                    console.log("사용자 데이터 추가함.");
                    return done(null, user);  // 검증 콜백에서 두 번째 파라미터의 값을 user 객체로 넣어 인증 성공한 것으로 처리
                });
            }
        });
    });

}));



// 사용자 인증 성공 시 호출
// 사용자 정보를 이용해 세션을 만듦
// 로그인 이후에 들어오는 요청은 deserializeUser 메소드 안에서 이 세션을 확인할 수 있음
passport.serializeUser(function(user, done) {
    console.log('serializeUser() 호출됨.');
    console.dir(user);

    done(null, user);  // 이 인증 콜백에서 넘겨주는 user 객체의 정보를 이용해 세션 생성
});

// 사용자 인증 이후 사용자 요청 시마다 호출
// user -> 사용자 인증 성공 시 serializeUser 메소드를 이용해 만들었던 세션 정보가 파라미터로 넘어온 것임
passport.deserializeUser(function(user, done) {
    console.log('deserializeUser() 호출됨.');
    console.dir(user);

    // 사용자 정보 중 id나 email만 있는 경우 사용자 정보 조회 필요 - 여기에서는 user 객체 전체를 패스포트에서 관리
    // 두 번째 파라미터로 지정한 사용자 정보는 req.user 객체로 복원됨
    // 여기에서는 파라미터로 받은 user를 별도로 처리하지 않고 그대로 넘겨줌
    done(null, user);
});

router.route('/login').post(passport.authenticate('local-login', {
    successRedirect : '/profile',
    failureRedirect : '/login',
    failureFlash : true
}));

router.route('/register').post(passport.authenticate('local-signup', {
    successRedirect : '/profile',
    failureRedirect : '/register',
    failureFlash : true
}));

router.route('/profile').get(function(req, res) {
    console.log('/profile 패스 요청됨.');

    // 인증된 경우, req.user 객체에 사용자 정보 있으며, 인증안된 경우 req.user는 false값임
    console.log('req.user 객체의 값');
    console.dir(req.user);

    // 인증 안된 경우
    if (!req.user) {
        console.log('사용자 인증 안된 상태임.');
        res.redirect('/');
        return;
    }

    // 인증된 경우
    console.log('사용자 인증된 상태임.');
    if (Array.isArray(req.user)) {
        res.render('profile.ejs', {user: req.user[0]._doc});
    } else {
        res.render('profile.ejs', {user: req.user});
    }
});

// 로그아웃 - 로그아웃 요청 시 req.logout() 호출함
router.route('/logout').get(function(req, res) {
    console.log('/logout 패스 요청됨.');

    req.logout();
    res.redirect('/');
});
