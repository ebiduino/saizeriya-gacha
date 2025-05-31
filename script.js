// HTML要素への参照を確実に取得
const gachaButton = document.getElementById('gachaButton');
const resultDiv = document.getElementById('result');
const targetAmountSelect = document.getElementById('targetAmountSelect'); // 目標金額選択
const includeAlcoholCheckbox = document.getElementById('includeAlcohol');
const excludeInVegetableCheckbox = document.getElementById('excludeInVegetable'); // 野菜除外チェックボックス

// HTML要素が見つからない場合は、コンソールに警告を表示し、処理を中断
if (!gachaButton || !resultDiv || !targetAmountSelect || !includeAlcoholCheckbox || !excludeInVegetableCheckbox) {
    console.error("エラー: 必要なHTML要素が見つかりません。index.htmlのIDを確認してください。");
    if (gachaButton) gachaButton.disabled = true;
    if (resultDiv) resultDiv.innerHTML = '<p class="error-message">ページの設定に問題があります。開発者に連絡してください。</p>';
    throw new Error("HTML要素の初期化に失敗しました。");
}

let allMenuItems = []; // メニューデータを格納する変数

// menu.jsonファイルを読み込む関数
async function loadMenuItems() {
    try {
        // GitHub Pagesでも動作するように相対パスに修正
        const response = await fetch('./menu.json'); 

        if (!response.ok) {
            throw new Error(`メニューデータの読み込みに失敗しました。HTTPステータス: <span class="math-inline">\{response\.status\} \(</span>{response.statusText})`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error("メニューデータが不正な形式です。JSONファイルが配列ではありません。");
        }
        allMenuItems = data; // 読み込んだデータを格納
        console.log('メニューデータを正常に読み込みました:', allMenuItems);

        gachaButton.disabled = false; // データ読み込み後にボタンを有効化
        resultDiv.innerHTML = '<p>メニューデータの読み込みが完了しました。目標金額と条件を選んでガチャを回してください。</p>';

    } catch (error) {
        console.error('メニューデータの読み込み中にエラーが発生しました:', error);
        resultDiv.innerHTML = `<p class="error-message">メニューデータの読み込みに失敗しました。<br>エラー: ${error.message}</p>`;
        gachaButton.disabled = true; // エラー時はボタンを無効化
    }
}

// ページが完全に読み込まれたら、メニューデータを読み込む関数を実行
window.addEventListener('DOMContentLoaded', loadMenuItems);

// ガチャボタンがクリックされた時の処理
gachaButton.addEventListener('click', () => {
    // データがまだ読み込まれていない場合は処理しない
    if (allMenuItems.length === 0) {
        resultDiv.innerHTML = '<p class="error-message">メニューデータがまだ読み込まれていません。しばらくお待ちいただくか、ページを再読み込みしてください。</p>';
        return;
    }

    gachaButton.disabled = true; // ボタンを一時的に無効化し、多重クリックを防ぐ
    resultDiv.innerHTML = '<p>組み合わせを探索中...</p>'; // 探索中のメッセージを表示

    // 選択された目標金額を取得 (文字列として取得されるので数値に変換)
    const targetAmount = parseInt(targetAmountSelect.value, 10);

    // ★★★ ここから新しい変更点：許容範囲の設定 ★★★
    // 目標金額からの許容範囲を定義
    const tolerance = 40; // 許容する差額（例: ±40円まで）
    const minAcceptableAmount = targetAmount - tolerance; // 960円
    const maxAcceptableAmount = targetAmount; // 1000円 (ピッタリも含む)
    // 最大アイテム数の調整 (組み合わせが見つかりやすくするため)
    const maxItems = 15; // 以前の10個から少し増やしました

    // アルコールを含むかどうかの設定を取得
    const includeAlcohol = includeAlcoholCheckbox.checked;
    // 野菜が苦手な人のメニューを除外する設定を取得
    const excludeInVegetable = excludeInVegetableCheckbox.checked;

    // 選択可能なメニューをフィルタリング（アルコール設定と野菜設定による除外）
    let availableMenuItems = allMenuItems.filter(item => {
        if (!includeAlcohol && item.isAlcohol) {
            return false;
        }
        if (excludeInVegetable && item.inVegetable) {
            return false;
        }
        // ★★★ ここも変更点：高すぎる商品は最初の候補から除外 ★★★
        // 目標金額（例えば1000円）より高い商品は、単独では選べないので除外
        // ただし、許容範囲のロジックを考えると、後で選ぶ商品には関係ないので、ここは残金でフィルタリングするループ内で判断
        // ここでは、単独で目標金額を超える高額すぎるメニュー（例：2200円のワインなど）をフィルタリング
        if (item.price > targetAmount) {
             return false;
        }
        return true;
    });

    // フィルタリングされたメニューが空でないか確認
    if (availableMenuItems.length === 0) {
        resultDiv.innerHTML = '<p class="error-message">選択された条件に合うメニューがありません。条件を変更してください。</p>';
        gachaButton.disabled = false;
        return;
    }

    const maxAttempts = 10000; // 試行回数の上限を設定（無限ループ防止のため）

    let foundCombination = null; // 見つかった組み合わせを格納する変数
    let attemptCount = 0;        // 試行回数カウンター

    // 組み合わせが見つかるか、試行回数の上限に達するまでループ
    while (attemptCount < maxAttempts && foundCombination === null) {
        attemptCount++;
        let currentCombination = [];
        let currentTotal = 0;
        
        // 毎回、利用可能なメニューのコピーを作成し、価格降順にソート
        let candidates = [...availableMenuItems].sort((a, b) => b.price - a.price);

        // 現在の試行での組み合わせ探索ループ
        while (currentTotal <= targetAmount && currentCombination.length < maxItems && candidates.length > 0) {
            // 残金以下で選べるメニューをフィルタリング（動的に候補を絞る）
            // 次に選ぶ商品が、残金以下で、かつ追加しても目標金額の最大許容値を超えないようにフィルタリング
            const affordableCandidates = candidates.filter(item => {
                // 選んだら目標金額の上限を超えてしまう商品は選ばない
                return item.price <= (targetAmount - currentTotal);
            });

            if (affordableCandidates.length === 0) {
                // 残金以下で選べるものがもうない場合、この組み合わせは失敗なので中断
                break;
            }

            // 選べるアイテムの中からランダムに一つ選ぶ
            const randomIndex = Math.floor(Math.random() * affordableCandidates.length);
            const chosenItem = affordableCandidates[randomIndex];

            currentCombination.push(chosenItem);
            currentTotal += chosenItem.price;

            // ※同じ商品を複数回選べるため、選んだアイテムをcandidatesから削除しない
        }

        // ★★★ ここが新しい変更点：合計金額が許容範囲内かチェック ★★★
        if (currentTotal >= minAcceptableAmount && currentTotal <= maxAcceptableAmount) {
            foundCombination = currentCombination;
        }
    }

    // 結果の表示
    if (foundCombination) {
        let resultHTML = '<h2>選ばれたメニュー:</h2>';
        foundCombination.forEach(item => {
            resultHTML += `<p>${item.code} - <span class="math-inline">\{item\.name\} \(</span>{item.price}円)</p>`;
        });
        const finalTotal = foundCombination.reduce((sum, item) => sum + item.price, 0);
        
        // 許容範囲によるメッセージの出し分け
        if (finalTotal === targetAmount) {
            resultHTML += `<p class="total-price">合計: ${finalTotal}円 (ちょうど！)</p>`;
        } else {
            resultHTML += `<p class="total-price">合計: ${finalTotal}円 (OK範囲内！)</p>`;
        }
        
        resultDiv.innerHTML = resultHTML;
    } else {
        resultDiv.innerHTML = `<p class="error-message">目標金額<span class="math-inline">\{targetAmount\}円（</span>{minAcceptableAmount}〜${maxAcceptableAmount}円）の組み合わせが見つかりませんでした。<br>もう一度ガチャを回してみてください！(試行回数: ${attemptCount}回)</p>`;
    }
    gachaButton.disabled = false; // 処理が完了したらボタンを再度有効化