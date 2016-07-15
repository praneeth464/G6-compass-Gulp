/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
$,
_,
G5
*/

/*
 * languages supported as of 29 Aug 2013
 * alpha by language, then localization

    German [Germany]            de_DE
    English [British]           en_GB
    English [U.S]               en_US
    Spanish [Spain]             es_ES
    Spanish [Latin America]     es_MX
    French [Canadian]           fr_CA
    French [Europe]             fr_FR
    Italian                     it_IT
    Japanese                    ja_JP
    Korean                      ko_KR
    Dutch                       nl_NL
    Polish                      pl_PL
    Portuguese                  pt_BR
    Russian                     ru_RU
    Simplified Chinese          zh_CN
    Traditional Chinese         zh_TW
*/


// number formatting
G5.props.setNumberFormat = function(format, groupingSeparator, decimalSeparator) {
    G5.props.numberFormat = {
        number: {
            format: format || '#,##0.0#',
            groupingSeparator: groupingSeparator || ',',
            decimalSeparator: decimalSeparator || '.'
        }
    };
    $.format.locale(G5.props.numberFormat);
};
// here is how to change the number format
G5.props.setNumberFormat('#,##0', ',', '.');


// base languages start here
// ==============================
    // bootstrap datepicker i18n
    // find more at: https://github.com/eternicode/bootstrap-datepicker/tree/master/js/locales

var base = {
    // German
    de : {
        richText     : {
            bold: "fett",
            italic: "kursiv",
            underline: "unterstreichen",
            orderedList : "ordered list",
            unorderedList : "unordered list",
            checkSpelling : "check speelling",
            removeFormat : "remooove formatting",
            charsRemaining: "vemainingz kharacterz"
        },
        spellChecker : {
            menu : "German",
            loading : "DE_DE Loading...",
            nosuggestions : "DE_DE (no suggestions)",
            addToDictionaryStart : 'DE_DE Are you sure you want to add the word "',
            addToDictionaryEnd : '" to the dictionary? DE_DE',
            postJsonError : "DE_DE Sorry, there was an error processing the request.",
            ignoreWord : "DE_DE Ignore word",
            ignoreAll : "DE_DE Ignore all",
            ignoreForever : "DE_DE Ignore forever",
            ignoreForeverTitle : "DE_DE Ignore word forever (add to dictionary)",
            noMisspellings : "DE_DE The spell check is complete."
        },
        /**
         * German translation for bootstrap-datepicker
         * Sam Zurcher <sam@orelias.ch>
         */
        datepicker   : {
            days: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
            daysShort: ["Son", "Mon", "Die", "Mit", "Don", "Fre", "Sam", "Son"],
            daysMin: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
            months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
            monthsShort: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
            today: "Heute"
        }
    },

    // English
    en : {
        // the library comes with base English strings preloaded, but they are reproduced here for reference
        richText     : {
            bold: "Bold",
            italic: "Italic",
            underline: "Underline",
            orderedlist: "Insert Ordered List",
            unorderedlist: "Insert Unordered List",
            html: "Show/Hide HTML Source View",
            checkSpelling : "Check spelling",
            removeFormat : "Remove formatting",
            charsRemaining: "Remaining Characters"
        },
        spellChecker : {
            menu : "English",
            loading : "Loading...",
            nosuggestions : "(no suggestions)",
            addToDictionaryStart : 'Are you sure you want to add the word "',
            addToDictionaryEnd : '" to the dictionary?',
            postJsonError : "Sorry, there was an error processing the request.",
            ignoreWord : "Ignore word",
            ignoreAll : "Ignore all",
            ignoreForever : "Ignore forever",
            ignoreForeverTitle : "Ignore word forever (add to dictionary)",
            noMisspellings : "The spell check is complete."
        },
        // built into the datepicker
        datepicker   : $.fn.datepicker.dates.en
    },

    // Spanish
    es : {
        richText     : {
            bold: "Bold",
            italic: "Italic",
            underline: "Underline",
            orderedlist: "Insert Ordered List",
            unorderedlist: "Insert Unordered List",
            html: "Show/Hide HTML Source View",
            checkSpelling : "Check spelling",
            removeFormat : "Remove formatting",
            charsRemaining: "Remaining Characters"
        },
        spellChecker : {},
        /**
         * Spanish translation for bootstrap-datepicker
         * Bruno Bonamin <bruno.bonamin@gmail.com>
         */
        datepicker   : {
            days: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
            daysShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
            daysMin: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"],
            months: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
            monthsShort: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
            today: "Hoy"
        }
    },

    // French
    fr : {
        richText     : {
            bold: "Bold",
            italic: "Italic",
            underline: "Underline",
            orderedlist: "Insert Ordered List",
            unorderedlist: "Insert Unordered List",
            html: "Show/Hide HTML Source View",
            checkSpelling : "Check spelling",
            removeFormat : "Remove formatting",
            charsRemaining: "Remaining Characters"
        },
        spellChecker : {},
        /**
         * French translation for bootstrap-datepicker
         * Nico Mollet <nico.mollet@gmail.com>
         */
        datepicker   : {
            days: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
            daysShort: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
            daysMin: ["D", "L", "Ma", "Me", "J", "V", "S", "D"],
            months: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
            monthsShort: ["Jan", "Fev", "Mar", "Avr", "Mai", "Jui", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"],
            today: "Aujourd'hui"
        }
    },

    // Italian
    it : {
        richText     : {},
        spellChecker : {},
        /**
         * Italian translation for bootstrap-datepicker
         * Enrico Rubboli <rubboli@gmail.com>
         */
        datepicker   : {
            days: ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"],
            daysShort: ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
            daysMin: ["Do", "Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"],
            months: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"],
            monthsShort: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
            today: "Oggi"
        }
    },

    // Japanese
    ja : {
        richText     : {},
        spellChecker : {},
        /**
         * Japanese translation for bootstrap-datepicker
         * Norio Suzuki <https://github.com/suzuki/>
         */
        datepicker   : {
            days: ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"],
            daysShort: ["日", "月", "火", "水", "木", "金", "土", "日"],
            daysMin: ["日", "月", "火", "水", "木", "金", "土", "日"],
            months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
            monthsShort: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
            today: "今日"
        }
    },

    // Korean
    ko : {
        richText     : {},
        spellChecker : {},
        /**
         * Korean translation for bootstrap-datepicker
         * Gu Youn <http://github.com/guyoun>
         */
        datepicker   : {
            days: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"],
            daysShort: ["일", "월", "화", "수", "목", "금", "토", "일"],
            daysMin: ["일", "월", "화", "수", "목", "금", "토", "일"],
            months: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
            monthsShort: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
        }
    },

    // Dutch
    nl : {
        richText     : {},
        spellChecker : {},
        /**
         * Dutch translation for bootstrap-datepicker
         * Reinier Goltstein <mrgoltstein@gmail.com>
         */
        datepicker   : {
            days: ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"],
            daysShort: ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"],
            daysMin: ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"],
            months: ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"],
            monthsShort: ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"],
            today: "Vandaag"
        }
    },

    // Polish
    pl : {
        richText     : {},
        spellChecker : {},
        /**
         * Polish translation for bootstrap-datepicker
         * Robert <rtpm@gazeta.pl>
         */
        datepicker   : {
            days: ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"],
            daysShort: ["Nie", "Pn", "Wt", "Śr", "Czw", "Pt", "So", "Nie"],
            daysMin: ["N", "Pn", "Wt", "Śr", "Cz", "Pt", "So", "N"],
            months: ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"],
            monthsShort: ["Sty", "Lu", "Mar", "Kw", "Maj", "Cze", "Lip", "Sie", "Wrz", "Pa", "Lis", "Gru"],
            today: "Dzisiaj"
        }
    },

    // Portuguese
    pt : {
        richText     : {},
        spellChecker : {},
        /**
         * Brazilian translation for bootstrap-datepicker
         * Cauan Cabral <cauan@radig.com.br>
         */
        datepicker   : {
            days: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"],
            daysShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
            daysMin: ["Do", "Se", "Te", "Qu", "Qu", "Se", "Sa", "Do"],
            months: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
            monthsShort: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
            today: "Hoje"
        }
    },

    // Russian
    ru : {
        richText     : {},
        spellChecker : {},
        /**
         * Russian translation for bootstrap-datepicker
         * Victor Taranenko <darwin@snowdale.com>
         */
        datepicker   : {
            days: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"],
            daysShort: ["Вск", "Пнд", "Втр", "Срд", "Чтв", "Птн", "Суб", "Вск"],
            daysMin: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
            months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
            monthsShort: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
            today: "Сегодня"
        }
    },

    // Chinese
    zh : {
        richText     : {
            bold: "Bold",
            italic: "Italic",
            underline: "Underline",
            orderedlist: "Insert Ordered List",
            unorderedlist: "Insert Unordered List",
            html: "Show/Hide HTML Source View",
            checkSpelling : "Check spelling",
            removeFormat : "Remove formatting",
            charsRemaining: "Remaining Characters"
        },
        spellChecker : {},
        /**
         * Simplified Chinese translation for bootstrap-datepicker
         * Yuan Cheung <advanimal@gmail.com>
         */
        datepicker   : {
            days: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"],
            daysShort: ["周日", "周一", "周二", "周三", "周四", "周五", "周六", "周日"],
            daysMin:  ["日", "一", "二", "三", "四", "五", "六", "日"],
            months: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
            monthsShort: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
            today: "今日"
        }
    }
};
// ==============================
// base languages end here


// all supported languages start here
// if these differ from the base, create a whole new object or merge just the changed fields
// ==============================

G5.props.richTextEditorLocalization = {
    de_DE : _.extend({}, base.de.richText, {}),
    en_GB : _.extend({}, base.en.richText, {
        // bold: "Bould" // just an example of a single merge
    }),
    en_US : _.extend({}, base.en.richText, {}),
    es_ES : _.extend({}, base.es.richText, {}),
    es_MX : _.extend({}, base.es.richText, {}),
    fr_CA : _.extend({}, base.fr.richText, {}),
    fr_FR : _.extend({}, base.fr.richText, {}),
    it_IT : _.extend({}, base.it.richText, {}),
    ja_JP : _.extend({}, base.ja.richText, {}),
    ko_KR : _.extend({}, base.ko.richText, {}),
    nl_NL : _.extend({}, base.nl.richText, {}),
    pl_PL : _.extend({}, base.pl.richText, {}),
    pt_BR : _.extend({}, base.pt.richText, {}),
    ru_RU : _.extend({}, base.ru.richText, {}),
    zh_CN : _.extend({}, base.zh.richText, {}),
    zh_TW : _.extend({}, base.zh.richText, {})
};


G5.props.spellCheckerLocalization = {
    de_DE : _.extend({}, base.de.spellChecker, {}),
    en_GB : _.extend({}, base.en.spellChecker, {
        menu : "English (UK)"
    }),
    en_US : _.extend({}, base.en.spellChecker, {
        menu : "English (US)"
    }),
    es_ES : _.extend({}, base.es.spellChecker, {}),
    es_MX : _.extend({}, base.es.spellChecker, {
        menu : "Spanish (Latin America)"
    }),
    fr_CA : _.extend({}, base.fr.spellChecker, {
        menu : "French (Canadian)"
    }),
    fr_FR : _.extend({}, base.fr.spellChecker, {}),
    it_IT : _.extend({}, base.it.spellChecker, {}),
    ja_JP : _.extend({}, base.ja.spellChecker, {}),
    ko_KR : _.extend({}, base.ko.spellChecker, {}),
    nl_NL : _.extend({}, base.nl.spellChecker, {}),
    pl_PL : _.extend({}, base.pl.spellChecker, {}),
    pt_BR : _.extend({}, base.pt.spellChecker, {}),
    ru_RU : _.extend({}, base.ru.spellChecker, {}),
    zh_CN : _.extend({}, base.zh.spellChecker, {}),
    zh_TW : _.extend({}, base.zh.spellChecker, {})
};
G5.props.spellCheckerLocalesToUse = ['de_DE', 'en_GB', 'en_US', 'es_MX', 'fr_CA'];


$.fn.datepicker.dates = _.extend($.fn.datepicker.dates, {
    de_DE : _.extend({}, base.de.datepicker, {}),
    en_GB : _.extend({}, base.en.datepicker, {}),
    en_US : _.extend({}, base.en.datepicker, {}),
    es_ES : _.extend({}, base.es.datepicker, {}),
    es_MX : _.extend({}, base.es.datepicker, {}),
    fr_CA : _.extend({}, base.fr.datepicker, {}),
    fr_FR : _.extend({}, base.fr.datepicker, {}),
    it_IT : _.extend({}, base.it.datepicker, {}),
    ja_JP : _.extend({}, base.ja.datepicker, {}),
    ko_KR : _.extend({}, base.ko.datepicker, {}),
    nl_NL : _.extend({}, base.nl.datepicker, {}),
    pl_PL : _.extend({}, base.pl.datepicker, {}),
    pt_BR : _.extend({}, base.pt.datepicker, {}),
    ru_RU : _.extend({}, base.ru.datepicker, {}),
    zh_CN : _.extend({}, base.zh.datepicker, {}),
    zh_TW : _.extend({}, base.zh.datepicker, {})
});


G5.props.availableLanguages = [
    {
        languageCode: "de_DE",
        languageName: "German",
            flagCode: "de"
    },
    {
        languageCode: "en_GB",
        languageName: "UK English",
            flagCode: "gb"
    },
    {
        languageCode: "en_US",
        languageName: "English",
            flagCode: "us"
    },
    {
        languageCode: "es_MX",
        languageName: "Spanish (Latin America)",
            flagCode: "es"
    },
    {
        languageCode: "fr_CA",
        languageName: "French (Canadian)",
            flagCode: "fr"
    }
];