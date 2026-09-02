import { initBearingModule } from './bearing.js';
import { initSettlementModule } from './settlement.js';
import { initConsolidationModule } from './consolidation.js';
import { initSlopeModule } from './slope.js';
import { initPileModule } from './pile.js';
import { initCastPileModule } from './cast_pile.js';

document.addEventListener('DOMContentLoaded', () => {
    // 상단 전체 초기화 버튼 전역 이벤트 리스너
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

    // 초기 실행 (기본 탭: 얕은기초 지지력 검토)
    initBearingModule(contentContainer);

    // 탭 클릭 이벤트 바인딩
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
                case 'cast_pile':
                    initCastPileModule(contentContainer);
                    break;
                default:
                    contentContainer.innerHTML = `<p>페이지를 찾을 수 없습니다.</p>`;
            }
        });
    });
});
