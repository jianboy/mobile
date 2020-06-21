<template>
    <Page>
        <ActionBar title="问卷信息" class="action-bar">
            <NavigationButton text="返回" android.systemIcon="ic_menu_back" @tap="$navigateBack" />
        </ActionBar>
        <GridLayout rows="auto auto * auto">
            <Label class="h2" :text="project.projectName" textWrap="true" style="text-align: center;" />
            <StackLayout row="1">
                <WrapLayout class="m-t-20">
                    <Label class="h3" text="版本号：" />
                    <Label class="h3" :text="questionaire.info.version" />
                </WrapLayout>
                <WrapLayout class="m-t-20">
                    <Label class="h3" text="更新时间：" />
                    <Label class="h3" :text="questionaire.info.versionTime" />
                </WrapLayout>
                <WrapLayout class="m-t-20">
                    <Label class="h3" text="题目数量：" />
                    <Label class="h3" :text="questionaire.questions.length" />
                </WrapLayout>
            </StackLayout>
            <!-- <Label :text="questionaire.info.hello" textWrap="true" row="2" style="margin-top:30"
                verticalAlignment="top" /> -->
            <StackLayout row="3">
                <Button :text="startButtonContent" @tap="onBegin()" :isEnabled="!isLoading" />
                <!-- <Label text="载入中..." v-if="isLoading" horizontalAlignment="center" ></Label> -->
                <Button text="查看数据" @tap="onViewData" class="m-t-10"></Button>
            </StackLayout>

        </GridLayout>

    </Page>
</template>
<script>
    import axios from "axios";
    import questionaire from './Questionaire'
    import Vue from 'nativescript-vue'
    import * as geolocation from "nativescript-geolocation";
    import { Accuracy } from "tns-core-modules/ui/enums";
    import questionaireData from './QuestionaireData'
    import * as app from 'tns-core-modules/application';
    // import { LoadingIndicator } from "@nstudio/nativescript-loading-indicator";
    // import {
    //     LoadingIndicator,
    //     Mode,
    //     OptionsCommon
    // } from '@nstudio/nativescript-loading-indicator';

    import * as Toast from 'nativescript-toast';
    import GPS from '../gpsTrans.js'

    export default {
        props: {
            project: {
                type: Object,
                default: {}
            },
        },
        data() {
            return {
                questionaire: {
                    info: {
                        id: 1,
                        version: 1,
                        hello: null,
                        bye: null,
                        versionTime: null
                    },
                    questions: [],
                    hops: [],
                    datasource: [],
                },
                isLoading: false
            }
        },
        computed: {
            startButtonContent() {
                return this.isLoading ? '正在载入......' : '开始问卷'
            },
        },
        mounted() {
            //先获取服务器端该问卷的status、version，如果本地存在status>=3(试访)且version相同的数据，则无需下载，否则下载
            let $this = this;
            axios.get(`${$this.$baseUrl}/questionaire/${$this.project.id}`).then(function (res) {
                let metadata = res.data;
                let removeVersion = metadata.version;

                $this.$db.get('select * from questionaire where questionaireId = ? and status >= 3 and version = ? and status = ?',
                    [$this.project.id, removeVersion, metadata.status])
                    .then(function (row) {
                        if (row) {
                            console.log('find questionaire in db');
                            $this.questionaire = JSON.parse(row[3]);
                            $this.initIsSelect();
                        } else {
                            var url = `${$this.$baseUrl}/questionaire/${$this.project.id}/complete-info`;
                            console.log('fetch complete info from server', url);
                            axios.get(url).then(response => {
                                console.log('success', response)
                                $this.questionaire = response.data;

                                // 写入数据库
                                let info = response.data.info;
                                $this.persistentQuestionaire(info.id, info.version, info.status, JSON.stringify(response.data));

                                $this.initIsSelect();

                            })
                        }
                    })
            })
        },
        methods: {
            persistentQuestionaire(questionaireId, version, status, contentJson) {
                let $this = this;
                $this.$db.execSQL('delete from questionaire where questionaireId = ?', [questionaireId], function (e) {
                    console.log('e', e);
                    $this.$db.execSQL('insert into questionaire values (?, ?, ?, ?)', [questionaireId, version, status, contentJson],
                        function (err) {
                            if (err) {
                                console.log('persistentQuestionaire failed', err);
                            } else {
                                console.log('persistentQuestionaire success');
                            }
                        });
                })

            },
            initIsSelect() {
                for (let i in this.questionaire.questions) {
                    for (let j in this.questionaire.questions[i].options) {
                        Vue.set(this.questionaire.questions[i].options[j], 'isSelected', false);
                    }
                }
            },
            onBegin() {
                let isRecord = this.questionaire.info.status >= 3;
                console.log('isRecord?', isRecord);
                if (this.questionaire.questions.length == 0) {
                    Toast.makeText('该问卷没有设置题目，无法开始').show();
                    return;
                }

                // var loader = new LoadingIndicator();
                // var options = {
                //     message: '载入中...',
                //     mode: Mode.AnnularDeterminate, // see options below
                //     android: {
                //         view: android.view.View, // Target view to show on top of (Defaults to entire window)
                //         cancelable: true,
                //         cancelListener: function (dialog) {
                //             console.log('Loading cancelled');
                //         }
                //     },
                //     ios: {
                //         view: UIView // Target view to show on top of (Defaults to entire window)
                //     }
                // }
                // loader.show(options);
                this.isLoading = true;
                // 获取位置
                let $this = this;
                // Toast.makeText('开始获取当前位置').show();

                // Toast.makeText('geolocation.isEnabled() = ' + geolocation.isEnabled()).show();
                console.log('geolocation.isEnabled() ', geolocation.isEnabled());

                if (!geolocation.isEnabled()) {
                    geolocation.enableLocationRequest();
                    console.log('enableLocationRequest success')
                    // Toast.makeText('enableLocationRequest success').show();
                }

                // geolocation.getCurrentLocation({ desiredAccuracy: Accuracy.any, maximumAge: 2000, timeout: 0 })
                geolocation.getCurrentLocation({ desiredAccuracy: Accuracy.high, updateDistance: 0.1, maximumAge: 5000, timeout: 20000 })
                    .then(function (location) {
                        let lat = location.latitude;
                        let long = location.longitude;
                        console.log('get location', `long = ${long}, lat = ${lat}`);
                        // Toast.makeText('获取位置成功', `long = ${long}, lat = ${lat}`).show();
                        // 针对百度地图纠正坐标
                        debugger;
                        let obj = GPS.wgs_84_to_bd_09(lat, long);
                        lat = obj.lat;
                        long = obj.lon;
                        console.log('after exchange', `long = ${long}, lat = ${lat}`);
                        // loader.hide();
                        $this.isLoading = false;
                        $this.startAnswer(long, lat, isRecord);

                    }, function (error) {
                        console.log('getCurrentLocation failed', error);
                        Toast.makeText('无法获取到当前位置:' + error.message).show();
                        $this.isLoading = true;
                        // loader.hide();
                        $this.startAnswer(-1, -1, isRecord);
                    })


            },
            onViewData() {
                this.$navigateTo(questionaireData, {
                    props: {
                        questionaire: this.questionaire.info
                    }
                });
            },
            startAnswer(long, lat, isRecord) {
                // if (long < 0) {
                    // Toast.makeText('无法获取到当前位置，无法开始').show();
                    // return;
                // }
                confirm({
                    title: "请确认",
                    message: "确定要开始问卷吗？",
                    okButtonText: "确定",
                    cancelButtonText: "取消"
                }).then(result => {
                    if (result) {
                        // debugger;
                        this.$showModal(questionaire, {
                            props: {
                                questionaire: this.questionaire,
                                long: long,
                                lat: lat,
                                isRecord: isRecord
                            },
                            fullscreen: true
                        })
                    }
                });
            },
        },
    }
</script>

<style scoped>
    GridLayout {
        margin: 20 10;
    }
</style>