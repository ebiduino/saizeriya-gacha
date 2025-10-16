// HTML要素への参照を確実に取得
const gachaButton = document.getElementById('gachaButton');
const resultDiv = document.getElementById('result');
const targetAmountSelect = document.getElementById('targetAmountSelect'); // 目標金額選択
const includeAlcoholCheckbox = document.getElementById('includeAlcohol');

// ★ excludeInVegetableCheckbox を削除 ★

// HTML要素が見つからない場合は、コンソールに警告を表示し、処理を中断
if (!gachaButton || !resultDiv || !targetAmountSelect || !includeAlcoholCheckbox) {
    console.error("エラー: 必要なHTML要素が見つかりません。index.htmlのIDを確認してください。");
    if (gachaButton) gachaButton.disabled = true; // ボタンを無効化
    if (resultDiv) resultDiv.innerHTML = '<p class="error-message">ページの設定に問題があります。開発者に連絡してください。</p>';
    throw new Error("HTML要素の初期化に失敗しました。");
}

let allMenuItems = []; // メニューデータを格納する変数

// menu.jsonファイルを読み込む関数
async function loadMenuItems() {
    try {
        const response = await fetch('./menu.json'); 

        if (!response.ok) {
            throw new Error(`メニューデータの読み込みに失敗しました。HTTPステータス: ${response.status} (${response.statusText})`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error("メニューデータが不正な形式です。JSONファイルが配列ではありません。");
        }
        allMenuItems = data;
        console.log('メニューデータを正常に読み込みました:', allMenuItems);

        gachaButton.disabled = false;
        resultDiv.innerHTML = '<p>メニューデータの読み込みが完了しました。目標金額と条件を選んでガチャを回してください。</p>';

    } catch (error) {
        console.error('メニューデータの読み込み中にエラーが発生しました:', error);
        resultDiv.innerHTML = `<p class="error-message">メニューデータの読み込みに失敗しました。<br>エラー: ${error.message}</p>`;
        gachaButton.disabled = true;
    }
}

window.addEventListener('DOMContentLoaded', loadMenuItems);

// ガチャボタンがクリックされた時の処理
gachaButton.addEventListener('click', () => {
    if (allMenuItems.length === 0) {
        resultDiv.innerHTML = '<p class="error-message">メニューデータがまだ読み込まれていません。しばらくお待ちいただくか、ページを再読み込みしてください。</p>';
        return;
    }

    gachaButton.disabled = true;
    resultDiv.innerHTML = '<p>組み合わせを探索中...</p>';

    const targetAmount = parseInt(targetAmountSelect.value, 10);
    const tolerance = 40;
    const minAcceptableAmount = targetAmount - tolerance;
    const maxAcceptableAmount = targetAmount;
    const maxItems = 15;

    const includeAlcohol = includeAlcoholCheckbox.checked;

    // ★ 野菜関連の条件を削除し、アルコール条件のみでフィルタ ★
    let availableMenuItems = allMenuItems.filter(item => {
        if (!includeAlcohol && item.isAlcohol) {
            return false;
        }
        if (item.price > targetAmount) {
            return false;
        }
        return true;
    });

    if (availableMenuItems.length === 0) {
        resultDiv.innerHTML = '<p class="error-message">選択された条件に合うメニューがありません。条件を変更してください。</p>';
        gachaButton.disabled = false;
        return;
    }

    const maxAttempts = 10000;
    let foundCombination = null;
    let attemptCount = 0;

    while (attemptCount < maxAttempts && foundCombination === null) {
        attemptCount++;
        let currentCombination = [];
        let currentTotal = 0;
        let candidates = [...availableMenuItems].sort((a, b) => b.price - a.price);

        while (currentTotal <= targetAmount && currentCombination.length < maxItems && candidates.length > 0) {
            const affordableCandidates = candidates.filter(item => {
                return item.price <= (targetAmount - currentTotal);
            });

            if (affordableCandidates.length === 0) {
                break;
            }

            const randomIndex = Math.floor(Math.random() * affordableCandidates.length);
            const chosenItem = affordableCandidates[randomIndex];
            
            currentCombination.push(chosenItem);
            currentTotal += chosenItem.price;
        }

        if (currentTotal >= minAcceptableAmount && currentTotal <= maxAcceptableAmount) {
            foundCombination = currentCombination;
        }
    }

    if (foundCombination) {
        let resultHTML = '<h2>選ばれたメニュー:</h2>';
        foundCombination.forEach(item => {
            resultHTML += `<p>${item.code} - ${item.name} (${item.price}円)</p>`;
        });
        const finalTotal = foundCombination.reduce((sum, item) => sum + item.price, 0);
        resultHTML += `<p class="total-price">合計: ${finalTotal}円</p>`;
        resultDiv.innerHTML = resultHTML;
    } else {
        resultDiv.innerHTML = `<p class="error-message">目標金額${targetAmount}円（${minAcceptableAmount}〜${maxAcceptableAmount}円）の組み合わせが見つかりませんでした。<br>もう一度ガチャを回してみてください！(試行回数: ${attemptCount}回)</p>`;
    }

    gachaButton.disabled = false;
});
