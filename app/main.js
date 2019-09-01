import Vue from 'nativescript-vue'
import App from './components/App'
import VueDevtools from 'nativescript-vue-devtools'
import axios from 'axios';
import RadListView from 'nativescript-ui-listview/vue';
import * as applicationSettings from 'tns-core-modules/application-settings'
import { knownFolders } from 'tns-core-modules/file-system';
import * as Sqlite from 'nativescript-sqlite';
import * as Toast from 'nativescript-toast';
// import { CheckBox} from 'nativescript-checkbox';

let initDb = function (db) {
    db.execSQL('create table answer_sheet(' +
        ' `sheetName` text, `questionaireId` int, ' +
        ' `status` int, `startTime` int, `endTime` int, ' +
        ' `locationLong` NUMERIC, `locationLat` NUMERIC, ' +
        ' `answerJson` text,  `dataUploaded` int, ' +
        ' `hasAudio` int, `audioUploaded` int, ' +
        ' `userName` text)', function (error) {
            if (error) {
                console.error('create table answer_sheet failed', error);
            } else {
                console.log('create table answer_sheet success')
            }
        });
    db.execSQL('create table questionaire (`questionaireId` int, `version` int, `status` int, `contentJson` text )',
        function (error) {
            if (error) {
                console.error('create table questionaire failed', error);
            } else {
                console.log('create table questionaire success')
            }
        });

    db.execSQL('create table version_info (`version_no` float, `description` text)', function (error) {
        if (error) {
            console.error('create table version_info failed', error);
        } else {
            console.log('create table version_info success')
        }
    })
}

let updateDb = function (db) {

}

function getConnectionType() {
    const connectivityModule = require("tns-core-modules/connectivity");
    const myConnectionType = connectivityModule.getConnectionType();
    switch (myConnectionType) {
        case connectivityModule.connectionType.none:
            // Denotes no Internet connection.
            console.log('connection type', "No connection");
            return 'None';
            break;
        case connectivityModule.connectionType.wifi:
            // Denotes a WiFi connection.
            console.log('connection type', "WiFi connection");
            return 'WiFi';
            break;
        case connectivityModule.connectionType.mobile:
            // Denotes a mobile connection, i.e. cellular network or WAN.
            console.log('connection type', "Mobile connection");
            return 'Mobile';
            break;
        case connectivityModule.connectionType.ethernet:
            // Denotes a ethernet connection.
            console.log('connection type', "Ethernet connection");
            return 'Ethernet';
            break;
        case connectivityModule.connectionType.bluetooth:
            // Denotes a bluetooth connection.
            console.log('connection type', "Bluetooth connection");
            return 'Bluetooth';
            break;
        default:
            return 'unknown';
            break;
    }
}

Vue.use(RadListView);

if (TNS_ENV !== 'production') {
    Vue.use(VueDevtools)
}
// Prints Vue logs when --env.production is *NOT* set while building
Vue.config.silent = (TNS_ENV === 'production')

// Vue.prototype.$baseUrl = 'http://127.0.0.1:8080/api';
// Vue.prototype.$baseUrl = 'http://192.168.1.4:8080/api';
Vue.prototype.$baseUrl = 'http://api.scxbzw.com/api';

console.log('audio path', knownFolders.documents().getFolder('audio').path);
let dbname = 'my.db';
let dbExist = Sqlite.exists(dbname);
console.log('exist db?', Sqlite.exists(dbname));
new Sqlite(dbname).then(database => {
    Vue.prototype.$db = database;
    console.log("db.isOpen()? ", database.isOpen() ? "Yes" : "No");
    if (!dbExist) {
        console.log('init db...');
        initDb(database);
    }

    axios.interceptors.request.use((config) => {
        console.log(`${config.method} url: ${config.url}`)
        var user = {};
        var userStr = applicationSettings.getString('userInfo');
        if (userStr) {
            user = JSON.parse(userStr);
        }

        if (user && user.userName) {
            config.headers['x-auth-token'] = user.token;
            console.log('get token from applicationSetings', user.token);
        }
        config.headers['Accept'] = 'application/json';
        config.headers['Content-Type'] = 'application/json';
        return config;
    }, (error) => {
        console.log('request error', error)
        return Promise.reject(error);
    });

    axios.interceptors.response.use(function (response) {
        // Do something with response data
        console.log('response', response)
        if (response.status == null && !response.data) {
            let connectionType = getConnectionType();
            console.log('网络请求失败，请检查网络设置。当前网络类型：' + connectionType);
            Toast.makeText('网络请求失败，请检查网络设置。当前网络类型：' + connectionType).show();
        }
        return response;
    }, function (error) {
        // Do something with response error
        if (error.response.status == 401) {
            // var a = router
            console.log(error.response.config);
            console.log('api returns 401');
            Toast.makeText('未登录或权限不足').show();
        } else {
            console.error(error.response);
            let errorMsg = '出错了：' + error.response.data.msg;
            Toast.makeText(errorMsg).show();
        }
        return Promise.reject(error);
    });


    // register plugins
    // Vue.registerElement('CheckBox',() => CheckBox);
    Vue.registerElement('CheckBox', () => require('nativescript-checkbox').CheckBox, {
        model: {
            prop: 'checked',
            event: 'checkedChange'
        }
    });

    new Vue({
        render: h => h('frame', [h(App)])
    }).$start()
})



