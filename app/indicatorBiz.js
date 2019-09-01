export default {
    // 判断当前题目的选项对应的配额是否已满
    isIndicartorOut: function (curQuestion, indicators, answers) {
        // 判断当前题目的答案是否设置了配额并且配额数量小于等于零
        // 如果是，递归检查父级配额，：
        // ----如果父级配额为空，则返回true
        // ----父级配额所对应的题目选项未选中，返回false
        // ----父级配额所对应的题目选项选中了，继续递归父级配额的父级配额

        if (!indicators) {
            return false;
        }

        let questionId = curQuestion.id;
        let optionId = answers[questionId].answer;
        for (let indicatorId in indicators) {
            let curIndicator = indicators[indicatorId];
            if (curIndicator.targetQuestion == questionId && curIndicator.targetOption == optionId) {
                // 找到了对应的配额
                console.log('find target indicator', curIndicator)
                if (curIndicator.fireCount >= curIndicator.maxCount) {
                    if (!curIndicator.parentIndicatorId) {
                        return true;
                    } else {
                        return this.isParentIndicatorMatch(curIndicator.parentIndicatorId, indicators, answers);
                    }
                } 
                // else {
                //     return false;
                // }
            }
        }
        return false;
    },

    // 递归判断父级配额是否满足
    isParentIndicatorMatch: function (parentIndicatorId, indicators, answers) {
        let parentIndicator = indicators[parentIndicatorId];
        let parentQuestionId = parentIndicator.targetQuestion;
        if (parentIndicator.targetOption == answers[parentQuestionId].answer) {
            if (!parentIndicator.parentIndicatorId) {
                return true;
            } else {
                return this.isParentIndicatorMatch(parentindicator.parentIndicatorId, indicators, answers);
            }
        } else {
            return false;
        }
    }
}