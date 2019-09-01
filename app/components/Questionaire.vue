<template>
    <Frame>
        <Page>
            <ActionBar :title="pageTitle" class="action-bar">
                <ActionItem @tap="onPreTap" text="后退" ios.position="left"
                    v-show="stage == 1 && questionaire.info.backEnable && questionHEAD >0" />
                <ActionItem @tap="onQuitTap" text="放弃" ios.position="right" v-show="stage < 2" />
            </ActionBar>
            <GridLayout rows="* auto" v-if="stage == 0" class="margin">
                <Label class="h2" :text="questionaire.info.hello" textWrap="true" verticalAlignment="top" />
                <Button text="继续" @tap="stage = 1" row="1" />
            </GridLayout>

            <GridLayout rows="auto * auto" v-else-if="stage==1">
                <StackLayout row="0">
                    <Progress :value="questionHEAD" :maxValue="questionaire.questions.length" />

                    <WrapLayout class="margin">
                        <Label class="h3" :text="questionHEAD + 1" />
                        <Label class="h3" text="[" style="margin-left: 5;" />
                        <Label class="h3" :text="questionType" />
                        <Label class="h3" text="]" style="margin-right: 5;" />
                        <Label class="h3" :text="questionBody" textWrap="true" />
                    </WrapLayout>

                    <Label style="font-size: 14" class="footnote m-x-10" :text="questionRemark" textWrap="true"
                        v-show="questionRemark" />

                    <TextView v-model="answerValue" hint="请在此输入答案" autocorrect="false" returnKeyType="go"
                        @returnPress="onQuestionConfirm" v-show="currentQuestion.type == 4" class="m-x-10" />

                </StackLayout>
                <RadListView ref="listView" for="opt in questionOptions" class="list-group"
                    v-if="currentQuestion.type == 1" row="1" selectionBehavior="Press"
                    :multipleSelection="questionType == '多选题'" @itemSelected="onOptionSelected">

                    <v-template>
                        <GridLayout class="list-group-item" columns="auto auto *">
                            <Label :text="questionOptions.indexOf(opt)+1" class="p-l-10"
                                :class="{'p-l-25':questionType == '多选题'}" textWrap="true" />
                            <Label text="、" col="1" />
                            <Label :text="opt.optionContent" style="padding-left:5" textWrap="true" col="2" />
                        </GridLayout>
                    </v-template>

                </RadListView>

                <!-- <GridLayout v-else-if="currentQuestion.type == 4" row="2" class="m-l-10 m-r-10">
                    
                </GridLayout> -->

                <Button text="继续" @tap="onQuestionConfirm" row="2" class="m-x-10"
                    :class="{'m-y-10':currentQuestion.type != 4,}" v-show="nextBtnVisible" />
            </GridLayout>
            <GridLayout rows="* auto" v-else class="margin">
                <Label class="body" :text="questionaire.info.bye" textWrap="true" verticalAlignment="top" />
                <Button text="继续" @tap="onFinishTap" row="1" />
            </GridLayout>

        </Page>
    </Frame>
</template>
<script>
    import axios from "axios";
    import Vue from 'nativescript-vue'
    import { AudioRecorderOptions, TNSRecorder } from 'nativescript-audio';
    import { File, knownFolders } from 'tns-core-modules/file-system';
    import * as app from 'tns-core-modules/application';
    import * as applicationSettings from 'tns-core-modules/application-settings'
    import dateFormat from '../dateFormat.js'
    import indicatorBiz from '../indicatorBiz.js'
    import * as Toast from 'nativescript-toast';

    export default {
        props: {
            questionaire: {
                type: Object,
                default: {}
            },
            long: {
                type: Number
            },
            lat: {
                type: Number
            },
            isRecord: {
                type: Boolean,
                default: true
            }
        },
        data() {
            return {
                stage: 0,
                questionHEAD: 0,
                answerSheet: {
                    questionaireId: this.questionaire.info.id,
                    sheetName: '',
                    status: 0,
                    startTime: null,
                    endTime: null,
                    locationLong: this.long,
                    locationLat: this.lat,
                },
                answers: {

                },
                answerValue: '',
                answerNote: {},
                recorder: null,
                isRecording: false,
                indicators: {},
                historyStack: [],
                nextBtnVisible: true,
            }
        },
        computed: {
            pageTitle() {
                console.log('compute page title');
                let title = '';
                switch (this.stage) {
                    case 0:
                        title = "问候语";
                        break;
                    case 1: title = "问卷内容";
                        break;
                    case 2: title = "问卷已结束";
                        break;
                }
                if (this.isRecording) {
                    return `${title}(录音中...)`
                } else {
                    return title;
                }
            },
            currentQuestion() {
                return this.questionaire.questions[this.questionHEAD];
            },
            boxType() {
                if (this.currentQuestion.maxOptions == 1) {
                    return 'circle'
                } else {
                    return 'square'
                }
            },
            questionType() {
                let type = this.currentQuestion.type;
                if (type == 1) {
                    if (this.currentQuestion.minOptions == 1 && this.currentQuestion.maxOptions == 1) {
                        return '单选题';
                    } else {
                        return '多选题';
                    }
                } else if (type == 3) {
                    return '排序题';
                } else if (type == 4) {
                    return '开放题';
                }
            },
            questionBody() {
                // 处理${ID}的情况
                return this.replaceDollarId(this.currentQuestion.body);
            },
            questionRemark() {
                // 处理${ID}的情况
                return this.replaceDollarId(this.currentQuestion.remark);
            },
            upperDatasourceQuestion() {
                console.log('call upperDatasourceQuestion');
                // 获取上一级的数据源所在的题目id（同一个id，但列数小1的题目）
                if (!this.currentQuestion.datasourceId) {
                    return 0;
                } else {
                    let dsId = this.currentQuestion.datasourceId
                    let dsColumn = this.currentQuestion.datasourceColumn;
                    for (let i = 0; i < this.questionHEAD; i++) {
                        if (this.questionaire.questions[i].datasourceId == dsId
                            && this.questionaire.questions[i].datasourceColumn == dsColumn - 1) {
                            return this.questionaire.questions[i].id;
                        }
                    }
                    return 0;
                }
            },
            questionOptions() {
                console.log('call questionOptions');
                if (this.upperDatasourceQuestion == 0) {
                    return this.currentQuestion.options;
                } else {
                    let dsId = this.currentQuestion.datasourceId
                    let dsColumn = this.currentQuestion.datasourceColumn;
                    let targetOptionId = this.answers[this.upperDatasourceQuestion].answer;
                    let dsFilter = this.findOptionContent(this.upperDatasourceQuestion, targetOptionId);
                    let subDataColumn = [];
                    let datasource = null;
                    for (let i in this.questionaire.datasource) {
                        if (this.questionaire.datasource[i].id == dsId) {
                            datasource = this.questionaire.datasource[i];
                            break;
                        }
                    }
                    if (!datasource) {
                        return this.currentQuestion.options;
                    }
                    for (let i in datasource.contentList) {
                        if (datasource.contentList[i]['c' + (dsColumn - 1)] == dsFilter) {
                            subDataColumn.push(datasource.contentList[i]['c' + dsColumn])
                        }
                    }

                    let subOptions = [];
                    for (let i in this.currentQuestion.options) {
                        if (this.currentQuestion.options[i].datasourceId == 0 ||
                            subDataColumn.indexOf(this.currentQuestion.options[i].optionContent) >= 0) {
                            subOptions.push(this.currentQuestion.options[i]);
                        }
                    }
                    return subOptions;

                }
            }
        },
        mounted() {
            debugger;
            if (app.android) {
                app.android.on(app.AndroidApplication.activityBackPressedEvent, this.backEventHandler);
            }
            let time = new Date();
            this.answerSheet.startTime = dateFormat.formatDate('yyyy-MM-dd HH:mm:ss', time);
            this.answerSheet.sheetName = this.generateSheetName(time);
            console.log('sheet name is', this.answerSheet.sheetName)
            // 开始录音
            let canRecord = TNSRecorder.CAN_RECORD()
            console.log('canRecord', canRecord)
            if (this.isRecord) {
                this.recorder = new TNSRecorder();
                this.recorder.debug = true;
                const audioFolder = knownFolders.documents().getFolder('audio');
                const projectFolder = audioFolder.getFolder(this.questionaire.info.id + '');
                console.log('project audio folder', JSON.stringify(projectFolder));
                let extention = app.android ? 'm4a' : 'caf';
                // let extention = "mp3";
                let filename = `${projectFolder.path}/${this.answerSheet.sheetName}.${extention}`;
                let recorderOpt = {
                    filename: filename,
                    metering: false,
                    infoCallback: infoObject => {
                        console.log('infoCallback', JSON.stringify(infoObject));
                    },

                    errorCallback: errorObject => {
                        console.log('errorCallback', JSON.stringify(errorObject));
                    }
                }
                if (app.android) {
                    recorderOpt.source = 0;
                    recorderOpt.format = 2;
                    recorderOpt.encoder = 3;
                }
                this.recorder.start(recorderOpt).then(() => {
                    this.isRecording = true;
                    console.info('recording started success');
                })
            } else {
                console.warn('not record audio');
            }
            if (this.isRecord && !canRecord) {
                Toast.makeText('该设备无法录音，无法开始').show();
                finishQuestionaire(5);
                return;
            }

            // 获取最新的配额
            let $this = this;
            axios.get(`${this.$baseUrl}/questionaire/${this.questionaire.info.id}/indicator`).then(function (response) {
                // $this.indicators = response.data
                for (let i = 0; i < response.data.length; i++) {
                    $this.indicators[response.data[i].id] = response.data[i];
                }
            });

            // 将本次运行写入数据库
            if (this.questionaire.info.status >= 3) {
                this.insertAnswerSheet();
            }
            this.onQuestionLoaded();
        },
        methods: {
            backEventHandler(args) {
                console.log('activityBackPressedEvent......')
                debugger;
                if (this.stage < 2) {
                    args.cancel = true;
                    this.onQuitTap();
                } else if (this.stage == 2) {
                    args.cancel = true;
                    this.onFinishTap();
                }
            },
            getUserName() {
                let userName = 'unknown';
                let str = applicationSettings.getString('userInfo');
                if (str) {
                    userName = JSON.parse(str).userName;
                }
                return userName;
            },
            getOrgCode() {
                let orgCode = 'unknown';
                let str = applicationSettings.getString('userInfo');
                if (str) {
                    orgCode = JSON.parse(str).orgCode;
                }
                return orgCode
            },
            generateSheetName(time) {
                let orgCode = this.getOrgCode();
                let userName = this.getUserName();
                return `${orgCode}-${dateFormat.formatDate('yyyyMMddHHmmss', time)}-${userName}`
            },
            replaceDollarId(body) {
                // 处理${ID}的情况
                let regex = /\$\{(?<id>\d+)\}/m;
                let match = regex.exec(body);
                while (match && match[0]) {
                    let targetQuestionId = match[1];
                    let targetOptionId = this.answers[targetQuestionId].answer;
                    let targetOptionContent = this.findOptionContent(targetQuestionId, targetOptionId);
                    body = body.replace(match[0], targetOptionContent)
                    match = regex.exec(body);
                }
                return body;
            },
            onQuitTap() {
                confirm({
                    title: "请确认",
                    message: "确定要结束问卷吗？",
                    okButtonText: "确定",
                    cancelButtonText: "取消"
                }).then(result => {
                    if (result) {
                        // 中途拒访
                        this.finishQuestionaire(2);
                    }
                })
            },
            onPreTap() {
                let lastIndex = this.historyStack.pop();
                this.questionHEAD = lastIndex;
                this.onQuestionLoaded(true)
            },
            onListItemTap(event) {
                let selectedOpt = event.item;
                selectedOpt.isSelected = !selectedOpt.isSelected;
                console.log('onListItemTap', `select option: ${selectedOpt.optionContent}, selected? ${selectedOpt.isSelected}`);
                this.onOptionChange(selectedOpt);
            },
            onCheckboxTap(selectedOpt, event) {
                if (selectedOpt.isSelected != event.value) {
                    console.log('onCheckboxTap', `select option: ${selectedOpt.optionContent},isSelected? ${selectedOpt.isSelected}, event.value: ${event.value}`);
                    selectedOpt.isSelected = event.value;
                    this.onOptionChange(selectedOpt);
                }
            },
            onOptionSelected({ index }) {
                let selectedIndex = index;
                let selectedOpt = this.questionOptions[selectedIndex]
                // var selectedIndex = this.questionOptions.indexOf(selectedOpt);

                // 处理单选和排它选项
                // if (selectedOpt.isSelected && (this.currentQuestion.maxOptions == 1 || selectedOpt.exclusive)) {
                //     for (let index in this.questionOptions) {
                //         if (this.questionOptions[index].isSelected && index != selectedIndex) {
                //             this.questionOptions[index].isSelected = false;
                //         }
                //     }
                // } else if (selectedOpt.isSelected) {
                //     for (let index in this.questionOptions) {
                //         if (this.questionOptions[index].isSelected && index != selectedIndex && this.questionOptions[index].exclusive) {
                //             this.questionOptions[index].isSelected = false;
                //         }
                //     }
                // }

                // 处理开放选项
                if (selectedOpt.open) {
                    prompt({
                        title: '请填写',
                        message: selectedOpt.openOptionTips,
                        okButtonText: "确定",
                        cancelButtonText: "取消",
                        defaultText: this.answerNote[selectedOpt.id],
                    }).then(result => {
                        console.log(`Dialog result: ${result.result}, text: ${result.text}`)
                        if (result.result) {
                            this.answerNote[selectedOpt.id] = result.text;
                        }
                    });
                }

            },
            onQuestionLoaded(isBack) {
                console.log('call onQuestionLoaded')
                if (isBack) {
                    debugger;
                    let lastQuestionId = this.questionaire.questions[this.questionHEAD].id;
                    let lastAnswer = this.answers[lastQuestionId];
                    this.answerValue = lastAnswer.answer;
                    if (this.currentQuestion.type == 1 && lastAnswer.answerNote) {
                        this.answerNote[lastAnswer.answer] = lastAnswer.answerNote;
                    }
                    delete this.answers[lastQuestionId];
                    // if (this.currentQuestion.type == 1) {
                    //     let selectedOptions = lastAnswer.answer.split(',');
                    //     for(let i = 0;i< selectedOptions.length;i++){
                    //         this.$refs.listView.listView._nativeView.selectItemAt(selectedOptions[i]);
                    //     }
                    // }
                } else {
                    this.answerValue = '';
                    this.answerNote = {};
                }
                // 根据题目类型，动态展示对应的答题方式
                // ---- 已在页面绑定中体现了

                // 处理${ID}的情况
                // ---- 已在computed questionBody()中处理

                // 处理数据源绑定（如果绑定了数据源并且上一列已经选中，则根据上一列的结果筛选选项）
                // ---- 已在computed questionOptions()中处理

                // 如果某选项会跳转到结束问卷，则提示出来
                // ---- 已在页面绑定中体现了
            },
            findOptionContent(targetQuestionId, targetOptionId) {
                for (let i in this.questionaire.questions) {
                    if (this.questionaire.questions[i].id == targetQuestionId) {
                        console.log('target qeustion', this.questionaire.questions[i].body);
                        for (let j in this.questionaire.questions[i].options) {
                            if (this.questionaire.questions[i].options[j].id == targetOptionId) {
                                console.log('target option', this.questionaire.questions[i].options[j].optionContent);
                                return this.questionaire.questions[i].options[j].optionContent;
                            }
                        }
                    }
                }
            },
            onQuestionConfirm() {
                console.log('onQuestionConfirm...')
                let selections = [];
                let selectionIds = []
                let questionId = this.questionaire.questions[this.questionHEAD].id;
                if (this.currentQuestion.type == 1) {
                    let selectedItems = this.$refs.listView.getSelectedItems()
                    for (let index in selectedItems) {
                        selections.push(selectedItems[index]);
                        selectionIds.push(selectedItems[index].id);
                    }

                    console.log('selections', selections);
                    if (this.currentQuestion.maxOptions && this.currentQuestion.maxOptions < selections.length) {
                        Toast.makeText(`最多可选中${this.currentQuestion.maxOptions}项`).show();
                        return;
                    }
                    if (this.currentQuestion.minOptions && this.currentQuestion.minOptions > selections.length) {
                        Toast.makeText(`最少需选中${this.currentQuestion.minOptions}项`).show();
                        return;
                    }

                    // 确定答案
                    // this.answers[questionId] = selectionIds.join(',');
                    this.answers[questionId] = {
                        questionId: questionId,
                        answer: selectionIds.join(',')
                    };
                    debugger;
                    if (this.currentQuestion.maxOptions == 1 && this.answerNote[selectionIds[0]]) {
                        this.answers[questionId].answerNote = this.answerNote[selectionIds[0]]
                    } else if (this.currentQuestion.maxOptions > 1) {
                        let answerNoteObj = {}
                        for (let index in selectionIds) {
                            let selectedId = selectionIds[index];
                            if (this.answerNote[selectedId]) {
                                answerNoteObj[selectedId] = this.answerNote[selectedId];
                            }
                        }
                        this.answers[questionId].answerNote = JSON.stringify(answerNoteObj);
                    }


                    // 判断是否配额不足
                    let isIndicartorOut = indicatorBiz.isIndicartorOut(this.currentQuestion, this.indicators, this.answers);
                    if (isIndicartorOut) {
                        // 配额不足，跳转至结束
                        this.finishQuestionaire(4);
                        return;
                    }

                    // 判断是否需要跳题以及是否需要结束问卷
                    let hopToQuestionId = 0;
                    if (this.currentQuestion.type == 1 && this.currentQuestion.maxOptions == 1) {
                        for (let i in this.questionOptions) {
                            let opt = this.questionOptions[i];
                            if (opt.id == selectionIds[0] && opt.redirectTo != 0) {
                                hopToQuestionId = opt.redirectTo;
                                break;
                            }
                        }
                    }
                    console.log('hop to question', hopToQuestionId);
                    if (hopToQuestionId == -2) {
                        // 甄别不过，跳转至结束
                        this.finishQuestionaire(3);
                        return;
                    } else if (hopToQuestionId == -1) {
                        // 正常结束
                        this.finishQuestionaire(1);
                        return;
                    } else if (hopToQuestionId > 0) {
                        // 跳转到某道题
                        for (let i in this.questionaire.questions) {
                            if (this.questionaire.questions[i].id == hopToQuestionId) {
                                this.questionHEAD = i;
                                this.onQuestionLoaded();
                                return;
                            }
                        }
                    }

                } else if (this.currentQuestion.type == 3) {
                    // 排序题
                } else if (this.currentQuestion.type == 4) {
                    // 开放题
                    if (this.currentQuestion.required && !this.answerValue) {
                        Toast.makeText('此项必填').show();
                        return;
                    }
                    this.answers[questionId] = {
                        questionId: questionId,
                        answer: this.answerValue
                    };
                }

                if (this.questionHEAD == this.questionaire.questions.length - 1) {
                    // 所有题目都回答完了，问卷正常结束
                    this.finishQuestionaire(1);
                    return;
                } else {
                    // 进入下一道题
                    this.historyStack.push(this.questionHEAD);
                    this.questionHEAD++;
                }
                this.onQuestionLoaded();
            },
            finishQuestionaire(status) {
                this.stage = 2;
                if (this.questionaire.info.status >= 3) {
                    this.answerSheet.status = status;
                    this.answerSheet.endTime = dateFormat.formatDate('yyyy-MM-dd HH:mm:ss', new Date());
                    let arr = [];
                    for (let i in this.answers) {
                        arr.push(this.answers[i])
                    }
                    // 持久化answerSheet数据
                    this.updateAnswerSheetData(JSON.stringify(arr));

                    axios.post(this.$baseUrl + `/questionaire/${this.questionaire.info.id}/answers`, {
                        sheet: this.answerSheet,
                        answers: arr
                    }).then(() => {
                        this.updateAnswerSheetDataUploaded(true);
                    })
                }
            },
            onFinishTap() {
                if (app.android) {
                    app.android.off(app.AndroidApplication.activityBackPressedEvent, this.backEventHandler);
                    console.log('backEventHandler off')
                }
                if (this.isRecord) {
                    this.recorder.stop().catch(ex => {
                        console.log('recorder stop failed', ex);
                        this.isRecording = false;
                    });
                }
                this.$modal.close();
            },
            insertAnswerSheet() {
                debugger;
                this.$db.execSQL('insert into answer_sheet values(?,?,?,?,?,?,?,?,?,?,?,?)',
                    [
                        this.answerSheet.sheetName,
                        this.answerSheet.questionaireId,
                        this.answerSheet.status,
                        this.answerSheet.startTime,
                        null,
                        this.answerSheet.locationLong,
                        this.answerSheet.locationLat,
                        null,
                        0,
                        this.isRecord ? 1 : 0,
                        0,
                        this.getUserName()
                    ], function (err) {
                        if (err) {
                            console.error('insertAnswerSheet error', err)
                        }
                    })
            },
            updateAnswerSheetData(answerJson) {
                this.$db.execSQL('update answer_sheet set endTime = ?, answerJson = ?, status = ? where sheetName = ?',
                    [
                        this.answerSheet.endTime,
                        answerJson,
                        this.answerSheet.status,
                        this.answerSheet.sheetName,
                    ], function (err) {
                        if (err) {
                            console.error('updateAnswerSheetData error', err)
                        }
                    })
            },
            updateAnswerSheetDataUploaded(isDataUploaded) {
                this.$db.execSQL('update answer_sheet set dataUploaded = ?  where sheetName = ?',
                    [
                        isDataUploaded ? 1 : 0,
                        this.answerSheet.sheetName,
                    ], function (err) {
                        if (err) {
                            console.error('updateAnswerSheetDataUploaded error', err)
                        }
                    })
            }
        },
    }
</script>

<style scoped>
    .margin {
        margin: 10;
    }

    .label {
        color: #fff;
        background-color: #f0ad4e;
        font-size: 12;
        vertical-align: baseline;
        padding: 2 4;
        border-radius: 2
    }
</style>