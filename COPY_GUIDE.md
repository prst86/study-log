# StudyLog をコピーする方法

## そのまま複製する

このフォルダには、StudyLogの動作に必要なファイルがすべて入っています。
フォルダごとコピーして使用してください。

必要なファイル:

- `index.html`
- `records.html`
- `plans.html`
- `calendar.html`
- `styles.css`
- `app.js`

## 起動する

コピー先のフォルダで、次のコマンドを実行します。

```bash
python3 -m http.server 8000
```

その後、ブラウザで次のURLを開きます。

```text
http://localhost:8000/index.html
```

## 別のHTMLへ組み込む

HTMLファイルの`<head>`内に次を追加します。

```html
<link rel="stylesheet" href="styles.css" />
```

`</body>`の直前に次を追加します。

```html
<script src="app.js"></script>
```

`app.js`は、`body`の`data-page`属性を見てページごとの表示を切り替えます。
