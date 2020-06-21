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
                <Button class="btn btn-default" text="关闭1" @tap="$modal.close(false)" style="margin-top:10"></Button>

            </StackLayout>
        </Page>
    </Frame>
</template>

<script>
    import axios from "axios";
    import * as applicationSettings from 'tns-core-modules/application-settings'
    import * as Toast from 'nativescript-toast';

    export default {
        data() {
            return {
                userName: "",
                userPassword: ""
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
                axios.post(this.$baseUrl + '/authentication/login', {
                    userName: this.userName,
                    userPassword: this.userPassword,
                    rememberMe: true,
                    deviceType: "mobile"
                }).then(response => {
                    debugger;
                    if (response.status != null) {
                        console.log('login success', response.data);
                        applicationSettings.setString("userInfo", JSON.stringify(response.data))
                        this.$modal.close(true);
                    }

                });
            },
        },
    }
</script>

<style scoped>
    TextField {
        margin: 10;
    }
</style>