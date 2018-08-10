const Constants = {
    api: "https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo",
    cacheKey: 'code',
    rowHeight: 64,
    redColor: $color("#e74c3c"),
    greenColor: $color("#2ecc71"),
    boldFont: $font("bold", 18),
    titleFont: $font(16),
    regularFont: $font(15),
    gainsFont: $font("bold", 17),
    addBtnWidth: ($device.info.screen.width - 30) / 2,
    gzCenterX: $device.info.screen.width / 2 - 130
}

Array.prototype.move = function (from, to) {
    [this[from], this[to]] = [this[to], this[from]];
}

let codeArr;
let temp;
let addCode = [];
function request() {
    if (temp) {
        render(temp, true)
    }

    !codeArr && (codeArr = $cache.get(Constants.cacheKey) || []);

    if (addCode) {
        addCode = [...new Set(addCode)];
        for (let i = 0; i < addCode.length; i++) {
            if (addCode[i].length != 6 || codeArr.some(code => code === addCode[i])) {
                addCode.splice(i, 1);
                i--;
            }
        }
    }

    // console.log(addCode)

    const length = codeArr.length + addCode.length;
    const codeStr = codeArr.join() + ',' + addCode.join();

    if (length > 0) {
        $http.post({
            url: Constants.api,
            header: {
                "Content-Type": 'application/x-www-form-urlencoded'
            },
            body: 'pageSize=' + length + '&Fcodes=' + codeStr
                + '&deviceid=Wap&plat=Wap&product=EFund&version=5.4.0',
            handler: resp => {
                var data = resp.data;
                temp = data.Datas;

                if (addCode.length > 0) {
                    addCode.forEach(code => {
                        if (temp.some(item => item.FCODE === code)) {
                            codeArr.push(code);
                        }
                    })
                    // console.log(codeArr)
                    $cache.set(Constants.cacheKey, codeArr);
                    addCode = [];
                }

                render(temp, false)
            }
        })
    } else {
        render(null, null)
    }
}

function render(data, loading) {
    let btn = [];
    let views = [];
    if (data) {
        views.push(getList(data, loading));
        if ($app.env === $env.today) {
            btn.push({ title: "刷新", handler: request });
        } else {
            views.push({
                type: "button",
                props: {
                    title: "刷新数据",
                },
                layout: (make, view) => {
                    make.left.bottom.right.inset(10)
                    make.height.equalTo(44)
                },
                events: {
                    tapped: request
                }
            })
        }
    }

    if ($app.env === $env.app) {
        views.push(
            {
                type: "button",
                props: {
                    title: "剪贴板添加",
                },
                layout: (make, view) => {
                    make.left.inset(10);
                    make.width.equalTo(Constants.addBtnWidth);
                    make.bottom.inset(data ? 60 : 10);
                    make.height.equalTo(44);
                },
                events: {
                    tapped: () => {
                        let text = $clipboard.text;
                        if (text.length > 0) {
                            // console.log(text)
                            addCode = text.match(new RegExp('\\d{6,7}(?!\\d)', 'g'));
                            // console.log(addCode)
                            if (addCode) {
                                request()
                            } else {
                                addCode = [];
                            }
                        }
                    }
                }
            },
            {
                type: "button",
                props: {
                    title: "输入添加",
                },
                layout: (make, view) => {
                    make.right.inset(10);
                    make.width.equalTo(Constants.addBtnWidth)
                    make.bottom.inset(data ? 60 : 10);
                    make.height.equalTo(44);
                },
                events: {
                    tapped: () => {
                        $input.text({
                            type: $kbType.number,
                            placeholder: "输入一个基金代码",
                            handler: text => {
                                if (text.length === 6) {
                                    addCode = [text];
                                    request();
                                }
                            }
                        })
                    }
                }
            }
        )
    }

    $ui.render({
        props: {
            title: "基金查询",
            navButtons: btn
        },
        views: views
    })
}

function getList(data, loading) {
    return {
        type: "scroll",
        layout: (make, view) => {
            make.top.left.right.inset(0);
            make.bottom.inset(($app.env === $env.app) * 100)
        },
        views: [{
            type: "list",
            layout: (make, view) => {
                make.top.inset(0)
                make.width.equalTo(view.super)
                make.height.equalTo((($app.env === $env.app) + data.length) * Constants.rowHeight + 50)
            },
            events: {
                reorderMoved: (from, to) => {
                    codeArr.move(from.row, to.row);
                    temp.move(from.row, to.row);
                    $cache.set(Constants.cacheKey, codeArr);
                },
            },
            props: {
                header: {
                    type: "view",
                    views: [
                        {
                            type: "label",
                            props: {
                                text: '基金名称',
                                font: Constants.titleFont
                            },
                            layout: (make, view) => {
                                make.left.inset(10)
                                make.centerY.equalTo(0)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                text: '估值',
                                font: Constants.titleFont
                            },
                            layout: (make, view) => {
                                make.centerY.equalTo(0)
                                make.centerX.equalTo(Constants.gzCenterX)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                text: '净值',
                                font: Constants.titleFont
                            },
                            layout: (make, view) => {
                                make.right.inset(20)
                                make.centerY.equalTo(0)
                            }
                        }

                    ]
                },
                reorder: true,
                rowHeight: Constants.rowHeight,
                data: data.map(item => {
                    return {
                        SHORTNAME: { text: item.SHORTNAME },
                        FCODE: { text: item.FCODE },
                        NAVCHGRT: {
                            text: (item.NAVCHGRT > 0 ? '+' : '') + `${item.NAVCHGRT}%`,
                            textColor: item.NAVCHGRT > 0 ? Constants.redColor : Constants.greenColor
                        },
                        NAV: {
                            text: item.NAV
                        },
                        PDATE: {
                            text: item.PDATE.slice(5),
                        },
                        GSZ: {
                            text: item.GSZ
                        },
                        GSZZL: {
                            text: (item.GSZZL > 0 ? '+' : '') + `${item.GSZZL}%`,
                            textColor: item.GSZZL > 0 ? Constants.redColor : Constants.greenColor
                        },
                        GZTIME: {
                            text: item.GZTIME.slice(5),
                        }
                    }
                }),
                actions: [
                    {
                        title: "delete",
                        color: $color("gray"),
                        handler: (sender, indexPath) => {
                            codeArr.splice(indexPath.row, 1);
                            temp.splice(indexPath.row, 1);
                            $cache.set(Constants.cacheKey, codeArr);
                            codeArr.length == 0 && request();
                        }
                    }
                ],
                template: {
                    views: [
                        {
                            type: "label",
                            props: {
                                id: "SHORTNAME",
                                font: Constants.boldFont
                            },
                            layout: (make, view) => {
                                make.left.top.inset(10)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: 'FCODE',
                                textColor: $color("lightGray"),
                                font: Constants.regularFont
                            },
                            layout: (make, view) => {
                                make.left.bottom.inset(10)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: 'NAV',
                                font: Constants.boldFont,
                                hidden: loading
                            },
                            layout: (make, view) => {
                                make.top.inset(3)
                                make.right.inset(10)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: 'NAVCHGRT',
                                font: Constants.gainsFont,
                                hidden: loading
                            },
                            layout: (make, view) => {
                                make.right.inset(10)
                                make.centerY.equalTo(1)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: 'PDATE',
                                textColor: $color("lightGray"),
                                font: Constants.regularFont,
                                hidden: loading
                            },
                            layout: (make, view) => {
                                make.bottom.inset(3)
                                make.right.inset(10)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: 'GSZ',
                                font: Constants.boldFont,
                                hidden: loading
                            },
                            layout: (make, view) => {
                                make.centerX.equalTo(Constants.gzCenterX)
                                make.top.inset(3)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: 'GSZZL',
                                font: Constants.gainsFont,
                                hidden: loading
                            },
                            layout: (make, view) => {
                                make.centerX.equalTo(Constants.gzCenterX)
                                make.centerY.equalTo(1)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: 'GZTIME',
                                textColor: $color("lightGray"),
                                font: Constants.regularFont,
                                hidden: loading
                            },
                            layout: (make, view) => {
                                make.bottom.inset(3)
                                make.centerX.equalTo(Constants.gzCenterX)
                            }
                        },
                        {
                            type: "spinner",
                            props: {
                                id: "spinner",
                                loading: loading
                            },
                            layout: (make, view) => {
                                make.centerY.equalTo(view.super)
                                make.centerX.equalTo(Constants.gzCenterX + 55)
                            }
                        }
                    ]
                }
            }
        }]
    }
}

request()
