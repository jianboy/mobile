<!-- 数据管理页面 -->
<template>
    <Page>
        <ActionBar :title="pageTitle" class="action-bar">
            <!-- <ActionItem @tap="onEnterEdit" text="编辑" ios.position="right" v-show="!editMode" />
            <ActionItem @tap="onExitEdit" text="完成" ios.position="right" v-show="editMode" /> -->
            <NavigationButton text="返回" android.systemIcon="ic_menu_back" @tap="$navigateBack" />
        </ActionBar>
        <GridLayout rows="auto * auto">
            <GridLayout class="m-l-10 m-r-10 m-t-10" columns="* auto" v-if="!editMode">
                <Label :text="listTitle" class="body"></Label>
                <Button text="管理" @tap="onEnterEdit" col="1" />
            </GridLayout>
            <GridLayout class="m-l-10 m-r-10 m-t-10" columns="auto * auto" v-else>
                <Button text="全选" @tap="selectAll" col="0" />
                <Button text="完成" @tap="onExitEdit" col="2" />
            </GridLayout>
            <RadListView ref="listView" for="item in itemList" class="list-group" @itemSelected="onItemSelected"
                @itemDeselected="onItemDeselected" row="1">
                <v-template>
                    <GridLayout columns="* auto" rows="* auto" :class="{'m-l-20':editMode,'list-group-item':true}">
                        <Label :text="item.sheetName" class="h3"></Label>
                        <Label :text="item.statusName" col="1" :class="{label:true, 'label-warn':item.statusCode != 1, 'label-success':item.statusCode == 1, }"></Label>
                        <WrapLayout row="1">
                            <Label :text="item.dataUploaded == 1? '数据已上传' : '数据未上传'" class="label label-default m-r-10"
                                :class="{'label-success':item.dataUploaded == 1}" />
                            <Label :text="item.audioUploaded == 1? '录音已上传' : '录音未上传'" class="label label-default"
                                :class="{'label-success':item.audioUploaded == 1}" />
                        </WrapLayout>

                    </GridLayout>
                </v-template>
            </RadListView>
            <GridLayout columns="* * *" row="2" class="m-10" v-show="editMode">
                <Button text="上传数据" col="0" @tap="onUploadData"/>
                <Button text="上传录音" col="1" @tap="onUploadAudio" />
                <Button text="删除" col="2" />
            </GridLayout>
        </GridLayout>

    </Page>
</template>

<script>

    import { File, knownFolders } from 'tns-core-modules/file-system';
    import * as bghttp from 'nativescript-background-http';
    import * as app from 'tns-core-modules/application';
    import axios from "axios";
    import * as applicationSettings from 'tns-core-modules/application-settings'
    import * as Toast from 'nativescript-toast';

    // 初始状态(0),
    // 成功(1),
    // 拒访(2),
    // 甄别不过(3),
    // 配额不足(4),
    export default {
        props: {
            questionaire: {
                type: Object,
                required: true
            },
        },
        data() {
            return {
                itemList: [],
                editMode: false,
                listTitle: '',
                selectedCount: 0,
                statusName: {
                    "0": "未完成",
                    "1": "成功",
                    "2": "拒访",
                    "3": "甄别不过",
                    "4": "配额不足"
                },
                uploadAudioSuccessCount: 0,
                uploadDataSuccessCount: 0,
            };
        },
        computed: {
            selectionBehavior() {
                return this.editMode ? 'Press' : 'None'
            },
            pageTitle() {
                if (!this.editMode) {
                    return '问卷数据'
                } else {
                    return this.selectedCount + ' 项'
                }
            }
        },
        methods: {
            onItemSelected({ index }) {
                console.log(`selected ${this.itemList[index].sheetName}`);
                this.updateStatus();
            },
            onItemDeselected({ index }) {
                console.log(`deselected ${this.itemList[index].sheetName}`);
                this.updateStatus();
            },
            updateStatus() {
                // bugs selectedCount int 选中数量
                this.selectedCount = this.$refs.listView.getSelectedItems().length;
            },
            //完成按钮事件
            onEnterEdit() {
                this.editMode = true;
                this.$refs.listView.listView._nativeView.selectionBehavior = 'Press'
                this.$refs.listView.listView._nativeView.multipleSelection = true;
                this.$refs.listView.listView._nativeView.resumeUpdates(true)
                // this.$refs.listView.listView._nativeView.refresh();
            },
            onExitEdit() {
                this.editMode = false;
                this.$refs.listView.listView._nativeView.selectionBehavior = 'None'
                this.$refs.listView.listView._nativeView.multipleSelection = false;
                this.$refs.listView.listView._nativeView.resumeUpdates(true)
                this.selectedCount = 0;
                // this.$refs.listView.listView._nativeView.refresh();
            },
            selectAll() {
                if (this.itemList.length == this.selectedCount) {
                    this.$refs.listView.listView._nativeView.deselectAll();
                } else {
                    this.$refs.listView.listView._nativeView.selectAll();
                }
                this.updateStatus();
            },
            onUploadAudio() {
                let selectedItems = this.$refs.listView.getSelectedItems();
                let selectedNames = [];
                for (let i in selectedItems) {
                    if (selectedItems[i].audioUploaded < 1) {
                        selectedNames.push(selectedItems[i].sheetName);
                    }
                }
                console.log(`will upload ${selectedNames.length} audio`);
                if (selectedNames.length == 0) {
                    Toast.makeText('没有选中要上传的录音').show();
                } else {
                    confirm({
                        title: "请确认",
                        message: `需要上传${selectedNames.length}个录音，确定要开始上传吗？`,
                        okButtonText: "确定",
                        cancelButtonText: "取消"
                    }).then(result => {
                        if (result) {
                            let sheetName = selectedNames.shift();
                            this.uploadAndio(selectedNames, sheetName);
                        }
                    })
                }
            },
            onUploadData() {
                let selectedItems = this.$refs.listView.getSelectedItems();
                let selectedNames = [];
                for (let i in selectedItems) {
                    if (selectedItems[i].dataUploaded < 1) {
                        selectedNames.push(selectedItems[i].sheetName);
                    }
                }
                console.log(`will upload ${selectedNames.length} audio`);
                if (selectedNames.length == 0) {
                    Toast.makeText('没有选中要上传的数据').show();
                } else {
                    confirm({
                        title: "请确认",
                        message: `需要上传${selectedItems.length}份数据，确定要开始上传吗？`,
                        okButtonText: "确定",
                        cancelButtonText: "取消"
                    }).then(result => {
                        if (result) {
                            let sheetName = selectedNames.shift();
                            this.uploadData(selectedNames, sheetName);
                        }
                    })
                }
            },
            getAudioFile(questionaire, sheetName){
                const audioFolder = knownFolders.documents().getFolder('audio');
                const projectFolder = audioFolder.getFolder(questionaire.id + '');
                let extention = app.android ? 'm4a' : 'caf';
                let filename = `${sheetName}.${extention}`;
                return projectFolder.getFile(filename)
            },
            uploadAndio(selectedNames, sheetName) {
                let $this = this;
                let file = this.getAudioFile(this.questionaire, sheetName);
                console.log('filename', file.path)
                // let name = file.substr(file.lastIndexOf("/") + 1);
                let name = file.name;
                var session = bghttp.session("audio-upload");
                let url = `${this.$baseUrl}/questionaire/${this.questionaire.id}/answers/${sheetName}`;
                var request = {
                    url: url,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/multipart/form-data"
                    },
                    description: "Uploading " + name
                };
                var params = [
                    { name: "file", filename: file.path }
                ];

                var task = session.multipartUpload(params, request);
                task.on("complete", function (e) {
                    console.log("received " + e.responseCode + " code");
                    $this.uploadAudioSuccessCount++;
                    $this.updateUploadStatus('audioUploaded', sheetName)

                    // 删除录音文件
                    file.remove();

                    if (selectedNames.length == 0) {
                        $this.uploadAudioComplete();
                    } else {
                        $this.uploadAndio(selectedNames, selectedNames.shift())
                    }
                });
                task.on("error", function (e) {
                    Toast.makeText(sheetName + '上传失败').show();
                });

            },
            uploadAudioComplete() {
                this.onExitEdit();
                Toast.makeText(`${this.uploadAudioSuccessCount}个录音上传成功`).show();
                this.uploadAudioSuccessCount = 0;
            },
            uploadDataComplete() {
                this.onExitEdit();
                Toast.makeText(`${this.uploadDataSuccessCount}份数据上传成功`).show();
                this.uploadDataSuccessCount = 0;
            },
            uploadData(selectedNames, sheetName) {
                let $this = this;
                debugger;
                $this.findBySheetName(sheetName, function (sheetItem, answers) {
                    console.log('sheetItem', JSON.stringify(sheetItem))
                    console.log('answers', JSON.stringify(answers));
                    axios.post($this.$baseUrl + `/questionaire/${$this.questionaire.id}/answers`, {
                        sheet: sheetItem,
                        answers: answers
                    }).then(() => {
                        // 上传成功
                        $this.uploadDataSuccessCount++;
                        $this.updateUploadStatus('dataUploaded', sheetName)
                        if (selectedNames.length == 0) {
                            $this.uploadDataComplete();
                        } else {
                            $this.uploadData(selectedNames, selectedNames.shift())
                        }
                    })
                })

            },
            updateUploadStatus(field, sheetName) {
                let $this = this;
                this.$db.execSQL(`update answer_sheet set ${field} = 1 where sheetName = ?`, [sheetName], function (error) {
                    if (error) {
                        console.error('updateUploadStatus failed', error);
                    } else {
                        for (let i in $this.itemList) {
                            if ($this.itemList[i].sheetName === sheetName) {
                                $this.itemList[i][field] = 1;
                            }
                        }
                    }
                });
            },
            findBySheetName(sheetName, callback) {
                this.$db.get('select * from answer_sheet where sheetName = ?', [sheetName], function (error, row) {
                    if (error) {
                        console.error('findBySheetName failed', error);
                    } else {
                        let filedList = ['sheetName', 'questionaireId', 'status', 'startTime', 'endTime', 'locationLong', 'locationLat', 'answerJson',]
                        let sheetItem = {};
                        for (let i = 0; i < filedList.length; i++) {
                            sheetItem[filedList[i]] = row[i]
                        }
                        let answers = JSON.parse(sheetItem.answerJson);
                        delete sheetItem.answerJson;
                        if (callback != null && typeof callback == 'function') {
                            callback(sheetItem, answers);
                        }
                    }
                })
            },
            getUserName() {
                let userName = 'unknown';
                let str = applicationSettings.getString('userInfo');
                if (str) {
                    userName = JSON.parse(str).userName;
                }
                return userName;
            }
        },
        mounted() {
            console.log('mounted......')
            let $this = this;
            this.$db.all('select sheetName, status, dataUploaded, audioUploaded from answer_sheet where questionaireId = ? and userName = ? order by startTime desc',
                [
                    this.questionaire.id,
                    this.getUserName()
                ],
                function (error, rows) {
                    if (error) {
                        console.error('db.all error', error);
                    } else {
                        console.info('$db.all success', `find ${rows.length} answerSheet`)
                        let okCount = 0;
                        for (let i = 0; i < rows.length; i++) {
                            let item = {
                                sheetName: rows[i][0],
                                statusName: $this.statusName[rows[i][1]],
                                statusCode: rows[i][1],
                                dataUploaded: rows[i][2],
                                audioUploaded: rows[i][3]
                            }
                            console.log('find row', JSON.stringify(item))
                            if (item.statusCode == 1) {
                                okCount += 1;
                            }
                            $this.itemList.push(item);
                        }
                        $this.listTitle = `共${rows.length}条数据，成功${okCount}条`
                    }
                });
        }

    }

</script>

<style scoped>
    .label {
        color: #fff;
        font-size: 12;
        vertical-align: baseline;
        padding: 2 4;
        border-radius: 2;
    }

    .label-default {
        background-color: #777;
    }

    .label-warn {
        background-color: #f0ad4e;
    }

    .label-success {
        background-color: #449d44;
        border-color: #398439;
    }

    .editModeMargin {
        margin-left: 25
    }
</style>