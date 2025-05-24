// HTML要素への参照を取得
const gachaButton = document.getElementById('gachaButton');
const resultDiv = document.getElementById('result');
const includeAlcoholCheckbox = document.getElementById('includeAlcohol');
const excludeInVegetableCheckbox = document.getElementById('excludeInVegetable');
// 新しく追加するドロップダウンメニューへの参照を取得
const targetAmountSelect = document.getElementById('targetAmountSelect'); // <-- この行を追加

// メニューデータを格納する変数
let allMenuItems = [];

// menu.jsonファイルを読み込む関数
async function loadMenuItems() {
    try {
        const response = await fetch('menu.json');
        if (!response.ok) {
            throw new Error(`HTTPエラーが発生しました！ ステータス: ${response.status}`);
        }
        allMenuItems = await response.json();
        console.log('メニューデータを正常に読み込みました:', allMenuItems);

        // データ読み込み後にボタンを有効にするなど、初期化処理があればここに
        gachaButton.disabled = false;
        resultDiv.innerHTML = '<p>メニューデータの読み込みが完了しました。目標金額を選んでガチャを回してください。</p>'; // メッセージ更新

    } catch (error) {
        console.error('メニューデータの読み込み中にエラーが発生しました:', error);
        resultDiv.innerHTML = `<p class="error-message">メニューデータの読み込みに失敗しました。ページを再読み込みしてください。<br>エラー: ${error.message}</p>`;
        gachaButton.disabled = true;
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
    const excludeInVegetable = excludeInVegetableCheckbox.checked;
    // 選択された目標金額を取得 (文字列として取得されるので数値に変換)
    const targetAmount = parseInt(targetAmountSelect.value, 10); // <-- この行を修正

    // 選択可能なメニューをフィルタリング（アルコール設定と野菜設定による除外）
    let availableMenuItems = allMenuItems.filter(item => {
        if (!includeAlcohol && item.isAlcohol) {
            return false;
        }
        if (excludeInVegetable && item.inVegetable) {
            return false;
        }
        return true;
    });

    // メニューが選択可能な状態かどうかをチェック
    if (availableMenuItems.length === 0) {
        resultDiv.innerHTML = '<p class="error-message">選択された条件に合うメニューがありません。条件を変更してください。</p>';
        gachaButton.disabled = false;
        return;
    }

    const maxAttempts = 10000;
    const maxItems = 10;

    let foundCombination = null;
    let attemptCount = 0;

    // 組み合わせが見つかるか、試行回数の上限に達するまでループ
    while (attemptCount < maxAttempts && foundCombination === null) {
        attemptCount++;
        let currentCombination = [];
        let currentTotal = 0;
        let candidates = [...availableMenuItems].sort((a, b) => b.price - a.price);

        while (currentTotal < targetAmount && currentCombination.length < maxItems && candidates.length > 0) {
            const affordableCandidates = candidates.filter(item => item.price <= (targetAmount - currentTotal));

            if (affordableCandidates.length === 0) {
                break;
            }

            const randomIndex = Math.floor(Math.random() * affordableCandidates.length);
            const chosenItem = affordableCandidates[randomIndex];

            currentCombination.push(chosenItem);
            currentTotal += chosenItem.price;
        }

        // 組み合わせが見つかったかチェック
        // 目標金額が1000円ちょうどの場合
        if (currentTotal === targetAmount) {
            foundCombination = currentCombination;
        }
        // ここに将来的に「±100円の許容範囲」のロジックを追加できます
        // if (currentTotal >= (targetAmount - 100) && currentTotal <= targetAmount) { ... }
    }

    // 結果の表示
    if (foundCombination) {
        let resultHTML = '<h2>選ばれたメニュー:</h2>';
        foundCombination.forEach(item => {
            resultHTML += `<p>${item.code} - ${item.name} (${item.price}円)</p>`;
        });
        resultHTML += `<p class="total-price">合計: ${foundCombination.reduce((sum, item) => sum + item.price, 0)}円</p>`; // 合計金額を再計算して表示
        resultDiv.innerHTML = resultHTML;
    } else {
        resultDiv.innerHTML = `<p class="error-message">ちょうど${targetAmount}円になる組み合わせが見つかりませんでした。<br>もう一度ガチャを回してみてください！(試行回数: ${attemptCount}回)</p>`;
    }
    gachaButton.disabled = false;
});