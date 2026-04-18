# Mock

`mock/design/` がメインのデザインモックです。

## ファイル
- `design/Home.html` — エントリポイント
- `design/app.jsx` — ホーム画面の全5状態 + コンポーネント
- `design/top.jsx` — トップページ（すぐ試す / ログイン）
- `design/styles.css` — デザイントークン + レイアウト

## 確認できる画面・状態
- トップページ（TOP）
- ホーム — テスト未作成 / 準備中 / 進行中 / 完了・結果未入力 / 完了・結果入力済み
- 保存案内ポップアップ（SavePrompt）

## 起動方法
`mock/design/` で静的サーバーを立てて `Home.html` を開く。

```bash
cd test-allocation-planner/mock/design
python3 -m http.server 8000
```

`http://localhost:8000/Home.html` を開く。

左パネルから画面・状態を切り替えられます。
