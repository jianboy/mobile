export default {
    formatNumberLength(num, length) {
        var r = "" + num;
        while (r.length < length) {
            r = "0" + r;
        }
        return r;
    },
    formatDate(dateFormat, date) {
        if (!date) {
            date = new Date();
        }
        let yearReg = /yyyy/;
        let match = yearReg.exec(dateFormat);
        if (match && match[0]) {
            dateFormat = dateFormat.replace(match[0], date.getFullYear())
        }

        let monthReg = /MM/;
        match = monthReg.exec(dateFormat);
        if (match && match[0]) {
            dateFormat = dateFormat.replace(match[0], this.formatNumberLength(date.getMonth() + 1, 2))
        }

        let dayReg = /dd/;
        match = dayReg.exec(dateFormat);
        if (match && match[0]) {
            dateFormat = dateFormat.replace(match[0], this.formatNumberLength(date.getDate(), 2))
        }

        let hourReg = /HH/;
        match = hourReg.exec(dateFormat);
        if (match && match[0]) {
            dateFormat = dateFormat.replace(match[0], this.formatNumberLength(date.getHours(), 2))
        }

        let minuteReg = /mm/;
        match = minuteReg.exec(dateFormat);
        if (match && match[0]) {
            dateFormat = dateFormat.replace(match[0], this.formatNumberLength(date.getMinutes(), 2))
        }

        let secondReg = /ss/;
        match = secondReg.exec(dateFormat);
        if (match && match[0]) {
            dateFormat = dateFormat.replace(match[0], this.formatNumberLength(date.getSeconds(), 2))
        }

        let milliSecReg = /SSS/
        match = milliSecReg.exec(dateFormat);
        if (match && match[0]) {
            dateFormat = dateFormat.replace(match[0], this.formatNumberLength(date.getMilliseconds(), 3))
        }
        return dateFormat;

    }
}