<template>
    <Page>
        <ActionBar :title="title" android:flat="true" class="action-bar">
            <!-- <ActionItem @tap="onTest" text="测试" ios.position="right" /> -->
        </ActionBar>
        <TabView @selectedIndexChange="onTabSelectionChanged" androidTabsPosition="bottom"
            selectedTabTextColor="#027AFF">
            <TabViewItem title="项目">
                <GridLayout rows="* auto">
                    <RadListView ref="listView" for="item in projects" style="background-color:#F4F4F4"
                        @itemTap="onItemTap" row="0" pullToRefresh="true"
                        @pullToRefreshInitiated="onPullToRefreshInitiated">
                        <v-template>
                            <StackLayout class="stylelayout">
                                <StackLayout style="background-color:white; padding:25 10 25 10">
                                    <Label :text="item.projectName" class="h2" textWrap="true"
                                        style="margin:0 0 10 0" />
                                    <GridLayout columns="auto * auto" rows="auto auto">
                                        <WrapLayout col="0">
                                            <Label text="编号：" class="body" />
                                            <Label :text="item.projectCode" class="body" />
                                        </WrapLayout>
                                        <WrapLayout col="3">
                                            <Label text="状态：" class="body" />
                                            <Label :text="item.statusName" class="body" />
                                        </WrapLayout>

                                        <WrapLayout row="1" colSpan="3" style="margin-top:5">
                                            <Label text="有效期" class="body" />
                                            <Label :text="item.validityFrom" class="body" />
                                            <Label text="~" class="body" />
                                            <Label :text="item.validityTo" class="body" />
                                        </WrapLayout>

                                    </GridLayout>
                                </StackLayout>
                                <!-- <GridLayout columns="* *" rows="*" style="background-color: #FAFAFA; padding:5">
                                                    <Button text="开始问卷" @tap="onBegin(item)" />
                                                    <Button text="查看数据" col="1" @tap="onViewData(item)" />
                                                </GridLayout> -->
                            </StackLayout>
                        </v-template>
                    </RadListView>
                    <Button :text="reloadText" @tap="queryProjectList" v-if="showReload" row="1" />
                </GridLayout>
            </TabViewItem>
            <TabViewItem title="我的">
                <GridLayout style="padding:20" rows="auto auto auto * auto" columns="auto *">
                    <Label class="h2" :text="user.nickName" colSpan="2" row="0" col="0"></Label>

                    <Label class="body myLabel" text="用户名" row="1" col="0"></Label>
                    <Label class="body myLabel" :text="user.userName" row="1" col="1"></Label>

                    <Label class="body myLabel" text="我的角色" row="2" col="0"></Label>
                    <WrapLayout row="2" col="1">
                        <Label class="body myLabel" v-for="role in user.roleNames" :key="role" :text="role"></Label>
                    </WrapLayout>

                    <StackLayout v-if="user.userName && user.userName!='未登录'" row="4" col="0" colSpan="2">
                        <GridLayout row="2" col="1" rows="*" columns="* auto *">
                            <Button class="btn btn-outline btn-rounded-sm" text="《用户协议》" @tap="onUsageAgreement"
                                col="0"></Button>
                            <!-- <Label text="|" col="1" style="margin-top: -10;" /> -->
                            <Button class="btn btn-outline" text="《隐私协议》" @tap="onPrivacyAgreement"
                                col="2"></Button>

                        </GridLayout>
                        <Button class="btn" text="退出登录" @tap="onLogout"></Button>
                    </StackLayout>
                    <StackLayout v-else row="4" col="0" colSpan="2">
                        <Button class="btn btn-primary" text="点击登录" @tap="loadUserInfo"></Button>
                    </StackLayout>


                </GridLayout>
            </TabViewItem>
        </TabView>
    </Page>
</template>

<script>
    import * as applicationSettings from 'tns-core-modules/application-settings'
    import Login from './Login'
    import axios from "axios";
    import projectDetail from './ProjectDetail'
    import agreements from '../agreements.js'

    export default {
        data() {
            return {
                msg: 'Hello World!',
                title: '项目',
                user: {
                    userName: "未登录",
                    nickName: "",
                    roleNames: []
                },
                projects: [],
                reloadText: "点击重试",
                lastTab: 0
            }
        },
        mounted() {
            this.queryProjectList();
        },
        computed: {
            showReload() {
                return this.projects.length == 0;
            },
        },
        methods: {
            onItemTap({ item }) {
                // console.log('tap index', event.index)
                // console.log('tap item', event.item)
                let project = item;
                console.log('projectName = ' + project.projectName)
                this.$navigateTo(projectDetail, {
                    props: {
                        project: project
                    }
                });
            },
            onViewData(project) {
                console.log('onViewData', project.projectName);
            },
            queryProjectList(listView) {
                console.log('begin query project list.......')
                this.reloadText = '点击重试';
                axios.get(this.$baseUrl + "/project?fromMobile=true").then(response => {
                    console.log('project list reponse', response)
                    if (response.status) {
                        this.projects = response.data;
                        console.log('projects.length', this.projects.length);
                        this.reloadText = `已显示${this.projects.length}份问卷`;
                    }
                    if (listView) {
                        listView.notifyPullToRefreshFinished();
                    }
                }, error => {
                    console.log(error);
                    if (error.response.status == 401) {
                        console.log('not login')
                        this.$showModal(Login, {
                            fullscreen: true
                        }).then(data => {
                            if (data) {
                                this.queryProjectList();
                            }
                        })
                    }
                    if (listView) {
                        listView.notifyPullToRefreshFinished();
                    }
                });
            },
            onTabSelectionChanged(event) {
                debugger;
                console.log("onTabSelectionChanged", event.value);
                switch (event.value) {
                    case 0:
                        this.title = '项目';
                        this.lastTab = 0;
                        break;
                    case 1:
                        this.title = '我的';
                        if (this.lastTab == 0) {
                            this.loadUserInfo();
                        }
                        this.lastTab = 1;
                        break;
                    default:
                        this.title = '项目';
                        break;
                }
            },
            loadUserInfo() {
                let str = applicationSettings.getString('userInfo');
                if (str) {
                    let userInfo = JSON.parse(str);
                    this.user.userName = userInfo.userName;
                    this.user.nickName = userInfo.nickName;
                    this.user.roleNames = userInfo.roleNames;
                } else {
                    this.$showModal(Login, {
                        fullscreen: true
                    }).then(data => {
                        console.log('data', data);
                        if (data) {
                            this.loadUserInfo();
                        }
                    })
                }
            },
            onLogout() {
                confirm('确定要退出当前用户吗？')
                    .then(result => {
                        if (result) {
                            applicationSettings.remove('userInfo');
                            this.user.userName = '未登录';
                            this.user.nickName = '';
                            this.user.roleNames.length = 0;
                            axios.post(this.$baseUrl + '/authentication/logout');
                        }
                    });
            },
            onPullToRefreshInitiated({ object }) {
                console.log('pulling');
                this.queryProjectList(object);
            },
            onUsageAgreement() {
                alert({
                    title: '用户协议内容',
                    message: agreements.usage_agreement,
                    okButtonText: '确定'
                });
            },
            onPrivacyAgreement() {
                alert({
                    title: '隐私协议内容',
                    message: agreements.privacy_agreement,
                    okButtonText: '确定'
                });
            }
        }
    }
</script>

<style scoped>
    ActionBar {
        /* background-color: #53ba82;
		color: #ffffff; */
    }

    .message {
        vertical-align: center;
        text-align: center;
        font-size: 20;
        color: #333333;
    }

    .myLabel {
        margin-top: 10;
        margin-bottom: 10;
        margin-right: 10
    }

    .stylelayout {
        border-width: 5;
        border-color: #F4F4F4;
    }
</style>