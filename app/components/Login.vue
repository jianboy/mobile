<!-- 登录页面 -->
<template>
    <Frame>
        <Page>
            <!-- <ActionBar title="请登录" class="action-bar">

		</ActionBar> -->
            <StackLayout>
                <Label class="h1" text="请登录" style="margin-top:100;text-align: center"></Label>
                <TextField v-model="userName" hint="请输入用户名" autocapitalizationType="none" />
                <TextField v-model="userPassword" hint="请输入密码" secure="true" autocapitalizationType="none" />
                <Button class="btn btn-primary" text="登录" @tap="onTap" style="margin-top:100"></Button>
                <Button class="btn btn-default" text="关闭" @tap="$modal.close(false)" style="margin-top:-2"></Button>
                <WrapLayout style="margin-top:-2">
                    <Label width="2%"></Label>
                    <check-box :checked="isChecked" @checkedChange="isChecked = $event.value" text="我已同意并同意" />
                    <Button class="btn btn-outline btn-rounded-sm" text="《用户协议》" @tap="onUsageAgreement"
                        style="margin-left: -5px; margin-right: -5px; padding:0"></Button>
                    <!-- <Label text="与"></Label> -->
                    <Button class="btn btn-outline" text="《隐私协议》" @tap="onPrivacyAgreement"
                        style="margin-left: -5px; padding:0"></Button>
                </WrapLayout>


            </StackLayout>
        </Page>
    </Frame>
</template>

<script>
    import axios from "axios";
    import * as applicationSettings from 'tns-core-modules/application-settings'
    import * as Toast from 'nativescript-toast';
    import agreements from '../agreements.js'

    export default {
        data() {
            return {
                userName: "",
                userPassword: "",
                isChecked: false
            }
        },
        methods: {
            onTap(event) {
                console.log(`userName = ${this.userName} , password = ${this.userPassword}`);
                console.log('baseUrl', this.$baseUrl);

                if (!this.userName) {
                    Toast.makeText('用户名不能为空').show();
                    return;
                }
                if (!this.userPassword) {
                    Toast.makeText('密码不能为空').show();
                    return;
                }

                if (!this.isChecked) {
                    Toast.makeText('请同意用户协议和隐私协议并继续').show();
                    return;
                }

                axios.post(this.$baseUrl + '/authentication/login', {
                    userName: this.userName,
                    userPassword: this.userPassword,
                    rememberMe: true,
                    deviceType: "mobile"
                }).then(response => {
                    debugger;
                    if (response.status != null) {
                        console.log('login success', response.data);
                        Toast.makeText('登录成功').show();
                        applicationSettings.setString("userInfo", JSON.stringify(response.data))
                        this.$modal.close(true);
                    }

                });
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
        },
    }
</script>

<style scoped>
    TextField {
        margin: 10;
    }
</style>