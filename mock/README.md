# Mock

最小の画面遷移確認用モックです。  
見た目は最低限で、操作の流れだけ確認できます。

## ファイル
- `src/index.html`
- `src/styles.css`
- `src/app.js`

## 確認できる画面
- ホーム
- テスト作成
- 前回引き継ぎ
- 目標・予定入力
- おすすめ配分
- 配分確定
- 進捗登録
- 進捗反映
- 結果入力
- 振り返り

## 起動例
`mock/` ディレクトリで静的サーバーを立てて `src/index.html` を開く。

例:

```bash
cd test-allocation-planner/mock
python3 -m http.server 8000
```

その後 `http://localhost:8000/src/` を開く。
