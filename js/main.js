import { initBearingModule } from './bearing.js';
import { initSettlementModule } from './settlement.js';
import { initConsolidationModule } from './consolidation.js';
import { initSlopeModule } from './slope.js';
import { initPileModule } from './pile.js';
import { initPileSettlementModule } from './pile_settlement.js'; // 모듈 임포트 추가

document.addEventListener('DOMContentLoaded', () => {
    // (초기화 로직 동일)
    const globalResetBtn = document.getElementById('global_reset_btn');
    if (globalResetBtn) {
        globalResetBtn.addEventListener('click', () => {
            if (confirm("모든 탭에 입력된 설계 자료, 지층 정보 및 계산 결과가 초기화됩니다. 계속하시겠습니까?")) {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('geo_')) {
                        localStorage.removeItem(key);
                    }
                });
                alert("모든 데이터가 초기화되었습니다.");
                location.reload();
            }
        });
    }

    const contentContainer = document.getElementById('app-content');
    const tabButtons = document.querySelectorAll('.tab-btn, .nav-tab');

    initBearingModule(contentContainer);

    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            const tabName = e.target.getAttribute('data-tab');

            switch (tabName) {
                case 'bearing':
                    initBearingModule(contentContainer);
                    break;
                case 'settlement':
                    initSettlementModule(contentContainer);
                    break;
                case 'consolidation':
                    initConsolidationModule(contentContainer);
                    break;
                case 'slope':
                    initSlopeModule(contentContainer);
                    break;
                case 'pile':
                    initPileModule(contentContainer);
                    break;
                case 'pile_settlement': // 라우팅 추가
                    initPileSettlementModule(contentContainer);
                    break;
                default:
                    contentContainer.innerHTML = `<p>페이지를 찾을 수 없습니다.</p>`;
            }
        });
    });
});
