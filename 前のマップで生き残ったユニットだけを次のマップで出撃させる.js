/*--------------------------------------------------------------------------
　前のマップで生き残ったユニットだけを次のマップで出撃させるスクリプト ver1.1

■作成者
キュウブ

■概要1
戦闘準備画面省略時に前マップで出撃したユニットを強制出撃させる事ができます
* 最大出撃人数分までしかユニットは配置されません

[使い方]
1.前マップで生存しているユニットの記録
前マップのイベント（エンディングイベント推奨）にて
"イベントコマンドスクリプトの実行->イベントコマンドの呼び出し" で "SaveSortieCommand" と記載したイベントコマンドを実行させる

2-1.生き残ったユニットを初期出撃位置に配置させたい場合
対象マップにて"戦闘準備画面を無し"と設定して、
マップ情報のカスパラに
{sortie_auto_setup:true}
と記入する

2-2.生き残ったユニットを任意の位置に配置させたい場合
対象マップのイベントにて
イベントコマンド->スクリプトの実行->コードの実行で
setUpSortieListUnit(index, x, y);
と入れる事で可能です

(例)
//SaveSortieCommandで保存した0番目のユニットを(2, 1)のマス目に配置する
setUpSortieListUnit(0, 2, 1)

※注意点
SaveSortieCommand実行から出撃イベントを起こすまでに
前マップで生き残っていたユニットが消去、負傷、死亡状態になっていた場合はバグる可能性があります。

■更新履歴
ver1.1 2022/03/30
リファクタリング&最新版でも動くように機能更新

■対応バージョン
SRPG Studio Version:1.161

■規約
・利用はSRPG Studioを使ったゲームに限ります。
・商用・非商用問いません。フリーです。
・加工等、問題ありません。
・クレジット明記無し　OK (明記する場合は"キュウブ"でお願いします)
・再配布、転載　OK (バグなどがあったら修正できる方はご自身で修正版を配布してもらっても構いません)
・wiki掲載　OK
・SRPG Studio利用規約は遵守してください。

--------------------------------------------------------------------------*/

(function () {
	var _ScriptExecuteEventCommand__configureOriginalEventCommand =
		ScriptExecuteEventCommand._configureOriginalEventCommand;
	ScriptExecuteEventCommand._configureOriginalEventCommand = function (groupArray) {
		_ScriptExecuteEventCommand__configureOriginalEventCommand.call(this, groupArray);
		groupArray.appendObject(SaveSortieCommand);
	};

	var SaveSortieCommand = defineObject(BaseEventCommand, {
		enterEventCommandCycle: function () {
			this._prepareEventCommandMemberData();
			return this._completeEventCommandMemberData();
		},

		moveEventCommandCycle: function () {
			return MoveResult.END;
		},

		drawEventCommandCycle: function () {},

		getEventCommmandName: function () {
			return "SaveSortieCommand";
		},

		getEventCommandName: function () {
			return "SaveSortieCommand";
		},

		isEventCommandSkipAllowed: function () {
			return true;
		},

		_prepareEventCommandMemberData: function () {},

		_completeEventCommandMemberData: function () {
			var sortieUnits = PlayerList.getSortieList();

			root.getMetaSession().global.sortieList = [];

			for (var index = 0; index < sortieUnits.getCount(); index++) {
				var unitId = sortieUnits.getData(index).getId();
				root.getMetaSession().global.sortieList.push(unitId);
			}
			return EnterResult.OK;
		},

		_createScreenParam: function () {
			return false;
		}
	});

	BattleSetupScene._moveBeforeSetup = function () {
		if (this._straightFlowBefore.moveStraightFlow() !== MoveResult.CONTINUE) {
			if (!root.getCurrentSession().getCurrentMapInfo().isBattleSetupScreenDisplayable()) {
				var isAutoSetup = root.getCurrentSession().getCurrentMapInfo()
					.custom.sortie_auto_setup;
				if (isAutoSetup) {
					this._sortieSetting.setTakingOverUnits();
				}
				return this._startBattle();
			}
			this._setupCommandManager.openListCommandManager();
			this.changeCycleMode(BattleSetupMode.TOPCOMMAND);
		}

		return MoveResult.CONTINUE;
	};

	/*
	 *  setTakingOverUnit
	 *
	 *  root.getMetaSession().global.sortieListの中に含まれるユニットIDを初期位置に順番に配置します
	 *  本来は_setInitialUnitPosを書き換えるべきだと思いましたが、他のスクリプトと競合しそうなんで新しく作りました
	 *
	 */
	SortieSetting.setTakingOverUnits = function () {
		var autoSortieUnits;
		var that = this;
		var maxSortieCount = root.getCurrentSession().getCurrentMapInfo().getSortieMaxCount();
		var playerUnits = root.getMetaSession().getTotalPlayerList();
		var autoSortieUnitIds = root.getMetaSession().global.sortieList;

		this._createSortiePosArray();
		if (typeof autoSortieUnitIds !== "object") {
			return;
		}
		this._clearSortieList();
		autoSortieUnits = autoSortieUnitIds
			.map(function (unitId) {
				return playerUnits.getDataFromId(unitId);
			})
			.slice(0, maxSortieCount);
		autoSortieUnits.forEach(function (unit) {
			that._sortieUnit(unit);
		});
	};
})();

/*
 * setUpSortieListUnit
 *  指定された場所にsortieListに格納されたユニットを配置するコマンド
 *
 * @param
 *   index (number): sortieListのインデックス
 *   x (number): ユニットを左からxマス目に配置する
 *   y (number): ユニットを上からyマス目に配置する
 *
 */
var setUpSortieListUnit = function (index, x, y) {
	var unit;
	var units = root.getCurrentSession().getPlayerList();
	if (typeof root.getMetaSession().global.sortieList === "object") {
		unit = units.getDataFromId(root.getMetaSession().global.sortieList[index]);
		if (unit) {
			unit.setSortieState(SortieType.SORTIE);
			unit.setMapX(x);
			unit.setMapY(y);
		}
	}
};

// Array.prototype.forEach polyfill
// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.com/#x15.4.4.18
if (!Array.prototype.forEach) {
	Array.prototype.forEach = function (callback, thisArg) {
		var T, k;
		if (this == null) {
			throw new TypeError(" this is null or not defined");
		}
		// 1. Let O be the result of calling ToObject passing the |this| value as the argument.
		var O = Object(this);
		// 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
		// 3. Let len be ToUint32(lenValue).
		var len = O.length >>> 0;
		// 4. If IsCallable(callback) is false, throw a TypeError exception.
		// See: http://es5.github.com/#x9.11
		if (typeof callback !== "function") {
			throw new TypeError(callback + " is not a function");
		}
		// 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
		if (thisArg) {
			T = thisArg;
		}
		// 6. Let k be 0
		k = 0;
		// 7. Repeat, while k < len
		while (k < len) {
			var kValue;
			// a. Let Pk be ToString(k).
			//   This is implicit for LHS operands of the in operator
			// b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
			//   This step can be combined with c
			// c. If kPresent is true, then
			if (k in O) {
				// i. Let kValue be the result of calling the Get internal method of O with argument Pk.
				kValue = O[k];
				// ii. Call the Call internal method of callback with T as the this value and
				// argument list containing kValue, k, and O.
				callback.call(T, kValue, k, O);
			}
			// d. Increase k by 1.
			k++;
		}
		// 8. return undefined
	};
}

// Array.isArray polyfill.
// ref:https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray#polyfill
if (!Array.isArray) {
	Array.isArray = function (arg) {
		return Object.prototype.toString.call(arg) === "[object Array]";
	};
}

// Production steps of ECMA-262, Edition 5, 15.4.4.19
// Reference: http://es5.github.io/#x15.4.4.19
if (!Array.prototype.map) {
	Array.prototype.map = function (callback /*, thisArg*/) {
		var T, A, k;

		if (this == null) {
			throw new TypeError("this is null or not defined");
		}

		// 1. Let O be the result of calling ToObject passing the |this|
		//    value as the argument.
		var O = Object(this);

		// 2. Let lenValue be the result of calling the Get internal
		//    method of O with the argument "length".
		// 3. Let len be ToUint32(lenValue).
		var len = O.length >>> 0;

		// 4. If IsCallable(callback) is false, throw a TypeError exception.
		// See: http://es5.github.com/#x9.11
		if (typeof callback !== "function") {
			throw new TypeError(callback + " is not a function");
		}

		// 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
		if (arguments.length > 1) {
			T = arguments[1];
		}

		// 6. Let A be a new array created as if by the expression new Array(len)
		//    where Array is the standard built-in constructor with that name and
		//    len is the value of len.
		A = new Array(len);

		// 7. Let k be 0
		k = 0;

		// 8. Repeat, while k < len
		while (k < len) {
			var kValue, mappedValue;

			// a. Let Pk be ToString(k).
			//   This is implicit for LHS operands of the in operator
			// b. Let kPresent be the result of calling the HasProperty internal
			//    method of O with argument Pk.
			//   This step can be combined with c
			// c. If kPresent is true, then
			if (k in O) {
				// i. Let kValue be the result of calling the Get internal
				//    method of O with argument Pk.
				kValue = O[k];

				// ii. Let mappedValue be the result of calling the Call internal
				//     method of callback with T as the this value and argument
				//     list containing kValue, k, and O.
				mappedValue = callback.call(T, kValue, k, O);

				// iii. Call the DefineOwnProperty internal method of A with arguments
				// Pk, Property Descriptor
				// { Value: mappedValue,
				//   Writable: true,
				//   Enumerable: true,
				//   Configurable: true },
				// and false.

				// In browsers that support Object.defineProperty, use the following:
				// Object.defineProperty(A, k, {
				//   value: mappedValue,
				//   writable: true,
				//   enumerable: true,
				//   configurable: true
				// });

				// For best browser support, use the following:
				A[k] = mappedValue;
			}
			// d. Increase k by 1.
			k++;
		}

		// 9. return A
		return A;
	};
}
