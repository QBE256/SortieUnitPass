/*--------------------------------------------------------------------------
　前のマップで生き残ったユニットだけを次のマップで出撃させるスクリプト

■作成者
キュウブ

■概要1
戦闘準備画面省略時に前マップで出撃したユニットを強制出撃させる事ができます
* 最大出撃人数分までしかユニットは配置されません

[使い方]
1.前マップのイベントで（エンディングイベントの最後が望ましい）"イベントコマンドスクリプトの実行-イベントコマンドの呼び出し"で"SaveSortieCommand"を指定する（この時点で生き残っているユニットを記録します）
2.次マップの"戦闘準備画面を無し"して、マップ情報のカスパラに"{sortie_auto_setup:true}"を記入する

■概要2
前マップで生き残ったユニットをイベントコマンドで任意の場所、タイミングで出現させる事ができます

[使い方]
1.前マップのイベントで（エンディングイベントの最後が望ましい）"イベントコマンドスクリプトの実行-イベントコマンドの呼び出し"で"SaveSortieCommand"を指定する（この時点で生き残っているユニットを記録します）
2.イベントコマンド-スクリプトの実行-コードの実行にsetUpSortieListUnit(index, x, y);を入れる事でSaveSortieCommandで保存したユニットを任意の位置に配置する事ができます
(例)
//SaveSortieCommandで保存した0番目のユニットを(2, 1)のマス目に配置する
setUpSortieListUnit(0, 2, 1)

■更新履歴


■対応バージョン
SRPG Studio Version:1.099

■規約
・利用はSRPG Studioを使ったゲームに限ります。
・商用・非商用問いません。フリーです。
・加工等、問題ありません。
・クレジット明記無し　OK (明記する場合は"キュウブ"でお願いします)
・再配布、転載　OK (バグなどがあったら修正できる方はご自身で修正版を配布してもらっても構いません)
・wiki掲載　OK
・SRPG Studio利用規約は遵守してください。

--------------------------------------------------------------------------*/

(function() {

	//-------------------------------------------
	// ScriptExecuteEventCommandクラス
	//-------------------------------------------
	var alias1 = ScriptExecuteEventCommand._configureOriginalEventCommand;
	ScriptExecuteEventCommand._configureOriginalEventCommand = function(groupArray) {
		alias1.call(this, groupArray);
	
		// SaveSortieCommandを追加
		groupArray.appendObject(SaveSortieCommand);
	};


	// SaveSortieCommandクラス
	SaveSortieCommand = defineObject(BaseEventCommand,
	{

		enterEventCommandCycle: function() {
			this._prepareEventCommandMemberData();
		
			if (!this._checkEventCommand()) {
				return EnterResult.NOTENTER;
			}
		
			return this._completeEventCommandMemberData();
		},

		moveEventCommandCycle: function() {

			return MoveResult.END;
		},

		drawEventCommandCycle: function() {
		},
	
		getEventCommmandName: function() {
			return 'SaveSortieCommand';
		},
		isEventCommandSkipAllowed: function() {
			// スキップを許可しないイベントコマンド(選択肢など)は、これをfalseを返す
			return true;
		},

		_prepareEventCommandMemberData: function() {
		},

		_checkEventCommand: function() {			
			var sortieList = PlayerList.getSortieList();

			root.getMetaSession().global.sortieList = [];

			for (var index = 0; index < sortieList.getCount(); index++) {
				root.getMetaSession().global.sortieList.push(sortieList.getData(index).getId());
			}	
			return true;
		},
	
		_completeEventCommandMemberData: function() {	
			return EnterResult.OK;
		},
	
		_createScreenParam: function() {
			return true;
		}		
	}
	);

	BattleSetupScene._moveBeforeSetup = function() {
		if (this._straightFlowBefore.moveStraightFlow() !== MoveResult.CONTINUE) {
			if (!root.getCurrentSession().getCurrentMapInfo().isBattleSetupScreenDisplayable()) {

				// 戦闘準備画面無しでマップ情報のカスパラsortie_auto_setupがtrueの場合は出撃ユニットを配置する
				if (typeof root.getCurrentSession().getCurrentMapInfo().custom.sortie_auto_setup === 'boolean' &&
				    root.getCurrentSession().getCurrentMapInfo().custom.sortie_auto_setup === true) {
					this._sortieSetting.autoSetupInitialUnitPos();
				}

				return this._startBattle();
			}

			this._setupCommandManager.openListCommandManager();
			this.changeCycleMode(BattleSetupMode.TOPCOMMAND);
		}

		return MoveResult.CONTINUE;
	};

	/*
	 * _autoSetupInitialUnitPos
	 *
	 *  root.getMetaSession().global.sortieListの中に含まれるユニットIDを初期位置に順番に配置します
	 *  本来は_setInitialUnitPosを書き換えるべきだと思いましたが、他のスクリプトと競合しそうなんで新しく作りました
	 *
	 */
	SortieSetting._autoSetupInitialUnitPos = function() {
		var unit;
		var list = root.getCurrentSession().getPlayerList();
		var maxCount = this._sortiePosArray.length;
		var sortieCount = 0;

		this._createSortiePosArray();

		// 雑に配列かどうかを確認しているイケてないif文
		if (typeof root.getMetaSession().global.sortieList === 'object' &&
		    typeof root.getMetaSession().global.sortieList.length === 'number') {		

			this._clearSortieList();
			for (var index = 0; sortieCount < maxCount && index < root.getMetaSession().global.sortieList.length; index++) {
				unit = list.getDataFromId(root.getMetaSession().global.sortieList[index]);
				if (unit != null) {
					if (this._sortieUnit(unit)) {
						sortieCount++;
					}
				}
			}
		}
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
var setUpSortieListUnit = function(index, x, y) {
	var list = root.getCurrentSession().getPlayerList();
	var unit;
	if (typeof root.getMetaSession().global.sortieList === 'object' &&
	    typeof root.getMetaSession().global.sortieList.length === 'number' &&
	    index < root.getMetaSession().global.sortieList.length) {
		unit = list.getDataFromId(root.getMetaSession().global.sortieList[index]);

		if (unit != null) {
			unit.setSortieState(SortieType.SORTIE);
			unit.setMapX(x);
			unit.setMapY(y);
		}
	}		
};