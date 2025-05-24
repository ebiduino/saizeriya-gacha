// HTML要素への参照を取得
const gachaButton = document.getElementById('gachaButton');
const resultDiv = document.getElementById('result');
const includeAlcoholCheckbox = document.getElementById('includeAlcohol');
const excludeInVegetableCheckbox = document.getElementById('excludeInVegetable'); // 新しく追加するチェックボックスへの参照

// メニューデータを格納する変数 (非同期で読み込まれるため、最初は空の状態)
let allMenuItems = [];

// menu.jsonファイルを読み込む関数
async function loadMenuItems() {
    try {
        // Fetch APIを使ってmenu.jsonファイルを読み込む
        // ※重要: ローカルファイルの場合、ブラウザのセキュリティ制限により直接読み込めない場合があります。
        // その場合は、VS Codeの「Live Server」拡張機能を使うと解決できます。
        const response = await fetch('menu.json'); // 'menu.json'ファイルを読み込む
        if (!response.ok) { // レスポンスが正常でなければエラーを投げる
            throw new Error(`HTTPエラーが発生しました！ ステータス: ${response.status}`);
        }
        allMenuItems = await response.json(); // レスポンスをJSONとして解析し、allMenuItemsに格納
        console.log('メニューデータを正常に読み込みました:', allMenuItems); // 開発者コンソールに表示

        // データ読み込み後にボタンを有効にするなど、初期化処理があればここに
        gachaButton.disabled = false; // データが読み込まれたらボタンを有効化
        resultDiv.innerHTML = '<p>メニューデータの読み込みが完了しました。ボタンを押してガチャを回してください。</p>';

    } catch (error) {
        console.error('メニューデータの読み込み中にエラーが発生しました:', error); // エラーを開発者コンソールに表示
        resultDiv.innerHTML = `<p class="error-message">メニューデータの読み込みに失敗しました。ページを再読み込みしてください。<br>エラー: ${error.message}</p>`;
        gachaButton.disabled = true; // エラー時はボタンを無効化
    }
}

// ページが完全に読み込まれたら、メニューデータを読み込む関数を実行
window.addEventListener('DOMContentLoaded', loadMenuItems);

// ガチャボタンがクリックされた時の処理
gachaButton.addEventListener('click', () => {
    // ボタンを一時的に無効化し、多重クリックを防ぐ
    gachaButton.disabled = true;

    // 結果表示エリアをクリアし、探索中のメッセージを表示
    resultDiv.innerHTML = '<p>組み合わせを探索中...</p>';

    // アルコールを含むかどうかの設定を取得
    const includeAlcohol = includeAlcoholCheckbox.checked;
    // 野菜が苦手な人のメニューを除外する設定を取得
    const excludeInVegetable = excludeInVegetableCheckbox.checked; // 新しく追加したチェックボックスの状態を取得

    // 選択可能なメニューをフィルタリング（アルコール設定と野菜設定による除外）
    let availableMenuItems = allMenuItems.filter(item => {
        // アルコール除外の条件
        if (!includeAlcohol && item.isAlcohol) {
            return false; // アルコールを含まない設定で、そのメニューがアルコール飲料であれば除外
        }
        
        // 野菜苦手な人のメニューを除外する条件
        // excludeInVegetable がtrueで、かつそのメニューにinVegetableフラグがtrueであれば除外
        if (excludeInVegetable && item.inVegetable) {
            return false;
        }

        return true; // 上記の除外条件に当てはまらなければ選択候補に含める
    });

    // メニューが選択可能な状態かどうかをチェック
    if (availableMenuItems.length === 0) {
        resultDiv.innerHTML = '<p class="error-message">選択された条件に合うメニューがありません。条件を変更してください。</p>';
        gachaButton.disabled = false;
        return; // これ以上処理しない
    }

    // 探索のターゲット金額
    const targetAmount = 1000;
    const maxAttempts = 10000; // 試行回数の上限を設定（無限ループ防止のため）
    const maxItems = 10; // 1つの組み合わせに含むアイテム数の上限（多すぎると見栄えが悪いので）

    let foundCombination = null; // 見つかった組み合わせを格納する変数
    let attemptCount = 0;        // 試行回数カウンター

    // 組み合わせが見つかるか、試行回数の上限に達するまでループ
    while (attemptCount < maxAttempts && foundCombination === null) {
        attemptCount++; // 試行回数をインクリメント
        let currentCombination = []; // 現在の試行での組み合わせ
        let currentTotal = 0;        // 現在の試行での合計金額

        // 毎回、利用可能なメニューのコピーを作成し、価格降順にソート
        // ソートは毎回行うことで、ランダム選択の独立性を保ちつつ、効率的な探索を可能にする
        // ※このソートは、ランダムに選ぶ際に残金以下のアイテムを見つけやすくする効果を期待します。
        // 同じアイテムを重複して選べるため、リストから削除する処理はありません。
        let candidates = [...availableMenuItems].sort((a, b) => b.price - a.price);

        // 現在の試行での組み合わせ探索ループ
        while (currentTotal < targetAmount && currentCombination.length < maxItems && candidates.length > 0) {
            // 残金以下で選べるメニューをフィルタリング（動的に候補を絞る）
            const affordableCandidates = candidates.filter(item => item.price <= (targetAmount - currentTotal));

            if (affordableCandidates.length === 0) {
                // 残金以下で選べるものがもうない場合、この組み合わせは失敗なので中断
                break;
            }

            // 選べるアイテムの中からランダムに一つ選ぶ
            const randomIndex = Math.floor(Math.random() * affordableCandidates.length);
            const chosenItem = affordableCandidates[randomIndex];

            // 選んだアイテムを現在の組み合わせに追加
            currentCombination.push(chosenItem);
            // 合計金額を更新
            currentTotal += chosenItem.price;

            // ※同じ商品を複数回選べる（重複を許可する）ため、
            // ここで `chosenItem` を `candidates` から削除する処理は行いません。
        }

        // 組み合わせが見つかったかチェック (目標金額1000円ちょうど)
        if (currentTotal === targetAmount) {
            foundCombination = currentCombination; // 組み合わせが見つかったら格納
        }
    }

    // 結果の表示
    if (foundCombination) {
        let resultHTML = '<h2>選ばれたメニュー:</h2>';
        foundCombination.forEach(item => {
            // 注文コード、メニュー名、価格を表示
            resultHTML += `<p>${item.code} - ${item.name} (${item.price}円)</p>`;
        });
        resultHTML += `<p class="total-price">合計: ${targetAmount}円</p>`;
        resultDiv.innerHTML = resultHTML;
    } else {
        resultDiv.innerHTML = `<p class="error-message">ちょうど${targetAmount}円になる組み合わせが見つかりませんでした。<br>もう一度ガチャを回してみてください！(試行回数: ${attemptCount}回)</p>`;
    }
    gachaButton.disabled = false; // 処理が完了したらボタンを再度有効化
});