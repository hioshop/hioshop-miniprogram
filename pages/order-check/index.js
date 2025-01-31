var util = require('../../utils/util.js');
var api = require('../../config/api.js');
const pay = require('../../services/pay.js');
const app = getApp()

Page({
    data: {
        checkedGoodsList: [],
        checkedAddress: {},
        goodsTotalPrice: 0.00, //商品总价
        freightPrice: 0.00, //快递费
        orderTotalPrice: 0.00, //订单总价
        actualPrice: 0.00, //实际需要支付的总价
        addressId: 0,
        goodsCount: 0,
        postscript: '',
        outStock: 0,
        payMethodItems: [{
                name: 'offline',
                value: '线下支付'
            },
            {
                name: 'online',
                value: '在线支付',
                checked: 'true'
            },
        ],
				payMethod:1,
				fixedAddress: 0, // 这个表示类似扫码进入的带有地址的进入
				extendsForm: {},
    },
    payChange(e){
        let val = e.detail.value;
        if(val == 'offline'){
            this.setData({
                payMethod:0
            })
        }
        else{
            this.setData({
                payMethod:1
            })
        }
    },
    toGoodsList: function (e) {
        wx.navigateTo({
            url: '/pages/ucenter/goods-list/index?id=0',
        });
    },
    toSelectAddress: function () {
        if(this.data.fixedAddress){
            wx.showToast({
                title: '已经帮您定位到当前位置',
                icon: 'none'
            })
            return;
        }
        wx.navigateTo({
            url: '/pages/ucenter/address/index?type=1',
        });
    },
    toAddAddress: function () {
        wx.navigateTo({
            url: '/pages/ucenter/address-add/index',
        })
    },
    bindinputMemo(event) {
        let postscript = event.detail.value;
        this.setData({
            postscript: postscript
        });
    },
    bindinputExtendsForm(event) {
				const value = event.detail.value;
				const key = event.currentTarget.dataset.key;
				this.data.extendsForm[key] = value;
    },
    onLoad: function (options) {
        let addType = options.addtype;
        let orderFrom = options.orderFrom;
        if (addType != undefined) {
            this.setData({
                addType: addType
            })
        }
        if (orderFrom != undefined) {
            this.setData({
                orderFrom: orderFrom
            })
				}
				if(options.fixedAddress){
					this.setData({
						fixedAddress: Number(options.fixedAddress),
					})
					this.getSettingsDetail();
				}
    },
    onUnload: function () {
        wx.removeStorageSync('addressId');
    },
    onShow: function () {
        // 页面显示
        // TODO结算时，显示默认地址，而不是从storage中获取的地址值
        try {
            var addressId = wx.getStorageSync('addressId');
            if (addressId == 0 || addressId == '') {
                addressId = 0;
            }
            this.setData({
                'addressId': addressId
            });
        } catch (e) {}
        this.getCheckoutInfo();
    },
    onPullDownRefresh: function () {
        wx.showNavigationBarLoading()
        try {
            var addressId = wx.getStorageSync('addressId');
            if (addressId == 0 || addressId == '') {
                addressId = 0;
            }
            this.setData({
                'addressId': addressId
            });
        } catch (e) {
            // Do something when catch error
        }
        this.getCheckoutInfo();
        wx.hideNavigationBarLoading() //完成停止加载
        wx.stopPullDownRefresh() //停止下拉刷新
    },
    getCheckoutInfo: function () {
        let that = this;
        let addressId = that.data.fixedAddress || that.data.addressId;
        let orderFrom = that.data.orderFrom;
        let addType = that.data.addType;
        util.request(api.CartCheckout, {
						addressId: addressId,
						addressType:that.data.fixedAddress ? 1 : 0,
            addType: addType,
            orderFrom: orderFrom,
            type: 0
        }).then(function (res) {
            if (res.errno === 0) {
                let addressId = 0;
                if (res.data.checkedAddress != 0) {
                    addressId = res.data.checkedAddress.id;
                }
                that.setData({
                    checkedGoodsList: res.data.checkedGoodsList,
                    checkedAddress: res.data.checkedAddress,
                    actualPrice: res.data.actualPrice,
                    addressId: addressId,
                    freightPrice: res.data.freightPrice,
                    goodsTotalPrice: res.data.goodsTotalPrice,
                    orderTotalPrice: res.data.orderTotalPrice,
                    goodsCount: res.data.goodsCount,
                    outStock: res.data.outStock
                });
                let goods = res.data.checkedGoodsList;
                wx.setStorageSync('addressId', addressId);
                if (res.data.outStock == 1) {
                    util.showErrorToast('有部分商品缺货或已下架');
                } else if (res.data.numberChange == 1) {
                    util.showErrorToast('部分商品库存有变动');
                }
            }
        });
		},
		async saveInfo() {
			let name = this.data.extendsForm.name;
			let mobile = this.data.extendsForm.mobile;
			mobile = mobile.replace(/(^\s*)|(\s*$)/g, "");
			if (mobile != '') {
				var myreg = /^(((13[0-9]{1})|(14[0-9]{1})|(15[0-9]{1})|(18[0-9]{1})|(17[0-9]{1})|(16[0-9]{1})|(19[0-9]{1}))+\d{8})$/;
				if (mobile.length < 11) {
					return util.showErrorToast('手机号码长度不对');
				} else if (!myreg.test(mobile)) {
					return util.showErrorToast('手机号码有问题');
				}
			}
			let avatar = this.data.extendsForm.avatar;
			let nickName = this.data.extendsForm.nickname;
			nickName = nickName.replace(/(^\s*)|(\s*$)/g, "");
			if (nickName == '') {
				util.showErrorToast('请输入昵称');
				return false;
			}
			return await util.request(api.SaveSettings, {
				name: name,
				mobile: mobile,
				nickName: nickName,
				avatar: avatar,
			}, 'POST').then(function (res) {
				if (res.errno !== 0) {
					return false
				}else{
					return true;
				}
			});
		},
		checkExtendsForm(){
			if(this.data.fixedAddress){
				if(!this.data.extendsForm.name){
					util.showErrorToast('请输入姓名');
					return false;
				}
				if(!this.data.extendsForm.mobile){
					util.showErrorToast('请输入手机号');
					return false;
				}

				return this.saveInfo();
			}

			return true;
		},
    // TODO 有个bug，用户没选择地址，支付无法继续进行，在切换过token的情况下
    submitOrder: async function (e) {
        if (this.data.addressId <= 0) {
            util.showErrorToast('请选择收货地址');
            return false;
				}
				if(!await this.checkExtendsForm()){
					return false;
				}
        let addressId = this.data.addressId;
        let postscript = this.data.postscript;
        let freightPrice = this.data.freightPrice;
        let actualPrice = this.data.actualPrice;
        wx.showLoading({
            title: '',
            mask:true
        })
        util.request(api.OrderSubmit, {
            addressId: addressId,
            postscript: postscript,
            freightPrice: freightPrice,
            actualPrice: actualPrice,
            offlinePay: 0
        }, 'POST').then(res => {
            if (res.errno === 0) {
                wx.removeStorageSync('orderId');
                wx.setStorageSync('addressId', 0);
                const orderId = res.data.orderInfo.id;
                pay.payOrder(parseInt(orderId)).then(res => {
                    wx.redirectTo({
                        url: '/pages/payResult/payResult?status=1&orderId=' + orderId
                    });
                }).catch(res => {
                    wx.redirectTo({
                        url: '/pages/payResult/payResult?status=0&orderId=' + orderId
                    });
                });
            } else {
                util.showErrorToast(res.errmsg);
            }
            wx.hideLoading()
        });
    },
    offlineOrder: async function (e) {
        if (this.data.addressId <= 0) {
            util.showErrorToast('请选择收货地址');
            return false;
				}
				if(!await this.checkExtendsForm()){
					return false;
				}
        let addressId = this.data.addressId;
        let postscript = this.data.postscript;
        let freightPrice = this.data.freightPrice;
        let actualPrice = this.data.actualPrice;
        util.request(api.OrderSubmit, {
            addressId: addressId,
            postscript: postscript,
            freightPrice: freightPrice,
            actualPrice: actualPrice,
            offlinePay: 1
        }, 'POST').then(res => {
            if (res.errno === 0) {
                wx.removeStorageSync('orderId');
                wx.setStorageSync('addressId', 0);
                wx.redirectTo({
                    url: '/pages/payOffline/index?status=1',
                })
            } else {
                util.showErrorToast(res.errmsg);
                wx.redirectTo({
                    url: '/pages/payOffline/index?status=0',
                })
            }
        });
		},
		getSettingsDetail() {
			let that = this;
			util.request(api.SettingsDetail).then(function (res) {
				if (res.errno === 0) {
					let userInfo = res.data;
					that.setData({
						extendsForm: userInfo,
					});
				}
			});
		},
})