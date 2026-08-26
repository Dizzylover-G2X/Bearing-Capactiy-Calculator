export function initPileModule(container) {
    const getVal = (id, defaultVal) => localStorage.getItem('geo_pile_' + id) ?? defaultVal;

    // 초기 지층 데이터 (말뚝기초-연직.pdf 기준)
    let pileLayers = JSON.parse(localStorage.getItem('geo_pile_layers'));
    if (!pileLayers || !Array.isArray(pileLayers) || pileLayers.length === 0) {
        pileLayers = [
            { name: '풍화토(N>40)', type: 'sand', dz: 4.40, n_val: 40, c_val: 25.0 },
            { name: '풍화암', type: 'sand', dz: 5.60, n_val: 40, c_val: 32.0 }
        ];
        localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers));
    }

    container.innerHTML = `
        <h3>2. 말뚝기초 연직지지력 및 검토</h3>
        
        <!-- 1. 말뚝기초 제원 및 시공 조건 -->
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 말뚝기초 제원 및 시공 조건</div>
        <div class="input-grid" style="margin-bottom: 15px;">
            <div class="input-group">
                <label>말뚝 종류</label>
                <select id="pile_type">
                    <option value="PHC" ${getVal('type', 'PHC') === 'PHC' ? 'selected' : ''}>PHC 말뚝</option>
                    <option value="PC" ${getVal('type', 'PHC') === 'PC' ? 'selected' : ''}>PC 말뚝</option>
                    <option value="RC" ${getVal('type', 'PHC') === 'RC' ? 'selected' : ''}>RC 말뚝</option>
                    <option value="STEEL" ${getVal('type', 'PHC') === 'STEEL' ? 'selected' : ''}>강관 말뚝</option>
                    <option value="CAST" ${getVal('type', 'PHC') === 'CAST' ? 'selected' : ''}>현장타설 콘크리트</option>
                </select>
            </div>
            <div class="input-group">
                <label>시공 공법</label>
                <select id="pile_method">
                    <option value="cement_paste" ${getVal('method', 'cement_paste') === 'cement_paste' ? 'selected' : ''}>매입 (시멘트페이스트 주입)</option>
                    <option value="driven" ${getVal('method', 'cement_paste') === 'driven' ? 'selected' : ''}>타격 공법</option>
                    <option value="bored_solid" ${getVal('method', 'cement_paste') === 'bored_solid' ? 'selected' : ''}>선굴착 고결 공법</option>
                    <option value="bored_final" ${getVal('method', 'cement_paste') === 'bored_final' ? 'selected' : ''}>선굴착 최종타격 공법</option>
                </select>
            </div>
            <div class="input-group">
                <label>말뚝 직경 D (m)</label>
                <input type="number" id="pile_D" value="${getVal('D', '0.800')}" step="0.01">
            </div>
            <div class="input-group">
                <label>말뚝 두께 t (mm)</label>
                <input type="number" id="pile_t" value="${getVal('t', '110')}" step="1">
            </div>
            <div class="input-group">
                <label>말뚝 길이 L (m)</label>
                <input type="number" id="pile_L" value="${getVal('L', '10.00')}" step="0.1">
            </div>
            <div class="input-group">
                <label>이음 방법 / 개소 수</label>
                <div style="display:flex; gap:5px;">
                    <select id="pile_joint_type" style="width:60%;">
                        <option value="weld" ${getVal('joint_type', 'weld') === 'weld' ? 'selected' : ''}>용접 이음</option>
                        <option value="bolt" ${getVal('joint_type', 'weld') === 'bolt' ? 'selected' : ''}>볼트 이음</option>
                        <option value="none" ${getVal('joint_type', 'weld') === 'none' ? 'selected' : ''}>이음 없음</option>
                    </select>
                    <input type="number" id="pile_joint_count" value="${getVal('joint_count', '0')}" min="0" style="width:40%; text-align:center;">
                </div>
            </div>
            <div class="input-group">
                <label>말뚝 재료 허용압축하중 (kN)</label>
                <input type="number" id="pile_mat_qa" value="${getVal('mat_qa', '3910.0')}" step="10">
            </div>
            <div class="input-group">
                <label>선단 지층 설계 N치 (상한 50)</label>
                <input type="number" id="pile_N_tip" value="${getVal('N_tip', '50')}" step="1" max="50">
            </div>
        </div>

        <!-- 2. 작용 하중 입력 -->
        <div style="font-weight: bold; margin-bottom: 8px; color: #d35400; font-size: 0.95em;">■ 작용 하중 (상부구조 반력)</div>
        <div class="input-grid" style="margin-bottom: 15px; background-color: #fdf2e9; padding: 10px; border-radius: 5px; border: 1px solid #edbb99;">
            <div class="input-group" style="background:#fff;">
                <label style="color:#d35400;">평상시 작용하중 P_norm (kN/본)</label>
                <input type="number" id="pile_P_norm" value="${getVal('P_norm', '2062.8')}" step="0.1">
            </div>
            <div class="input-group" style="background:#fff;">
                <label style="color:#c0392b;">내진시 작용하중 P_seis (kN/본)</label>
                <input type="number" id="pile_P_seis" value="${getVal('P_seis', '1728.6')}" step="0.1">
            </div>
        </div>

        <!-- 3. 주면마찰력 산정을 위한 지층 정보 -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-weight: bold; color: #27ae60; font-size: 0.95em;">■ 주면마찰력 산정용 지층 정보</div>
            <button type="button" id="pile_layer_add" style="padding: 4px 10px; background: #27ae60; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85em; font-weight: bold;">+ 지층 추가</button>
        </div>
        
        <div style="background-color: #e8f8f5; padding: 12px; border-radius: 6px; border: 1px solid #a3e4d7; margin-bottom: 15px;">
            <div class="table-container" style="margin: 0;">
                <table class="result-table" style="font-size: 0.85em; text-align: center; margin: 0; width: 100%;">
                    <thead>
                        <tr style="background-color: #d1f2eb;">
                            <th>지층명</th>
                            <th>토성 구분</th>
                            <th>층후 L (m)</th>
                            <th>평균 N치</th>
                            <th>점착력 c (kN/m²)</th>
                            <th>삭제</th>
                        </tr>
                    </thead>
                    <tbody id="pile_layers_body">
                        <!-- 동적 생성 렌더링 -->
                    </tbody>
                </table>
            </div>
        </div>

        <button class="action-btn" id="calc-pile-btn" style="margin-top: 10px;">말뚝 연직지지력 산정 및 검토</button>
        <div id="pile-result" class="result-box"></div>
    `;

    function renderLayers() {
        const tbody = document.getElementById('pile_layers_body');
        if (!tbody) return;
        tbody.innerHTML = '';
        pileLayers.forEach((l, idx) => {
            tbody.innerHTML += `
                <tr>
                    <td style="padding:4px;"><input type="text" value="${l.name}" data-idx="${idx}" class="pl-name" style="width:100%; text-align:center;"></td>
                    <td style="padding:4px;">
                        <select data-idx="${idx}" class="pl-type" style="width:100%;">
                            <option value="sand" ${l.type === 'sand' ? 'selected' : ''}>사질토 / 풍화암</option>
                            <option value="clay" ${l.type === 'clay' ? 'selected' : ''}>점성토</option>
                        </select>
                    </td>
                    <td style="padding:4px;"><input type="number" value="${l.dz.toFixed(2)}" data-idx="${idx}" class="pl-dz" step="0.1" style="width:100%; text-align:center;"></td>
                    <td style="padding:4px;"><input type="number" value="${l.n_val}" data-idx="${idx}" class="pl-n" step="1" style="width:100%; text-align:center;"></td>
                    <td style="padding:4px;"><input type="number" value="${l.c_val.toFixed(1)}" data-idx="${idx}" class="pl-c" step="0.5" style="width:100%; text-align:center;"></td>
                    <td style="padding:4px;"><button type="button" class="pl-del" data-idx="${idx}" style="padding:3px 8px; background:#e74c3c; color:#fff; border:none; border-radius:3px; cursor:pointer;">-</button></td>
                </tr>
            `;
        });
    }
    renderLayers();

    // Event Listeners for Storage and Layer Table
    const inputs = container.querySelectorAll('.input-grid input, .input-grid select');
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            let key = this.id.replace('pile_', '');
            localStorage.setItem('geo_pile_' + key, this.value);
        });
    });

    container.addEventListener('change', (e) => {
        if (e.target.classList.contains('pl-name')) pileLayers[e.target.dataset.idx].name = e.target.value;
        if (e.target.classList.contains('pl-type')) pileLayers[e.target.dataset.idx].type = e.target.value;
        if (e.target.classList.contains('pl-dz')) pileLayers[e.target.dataset.idx].dz = parseFloat(e.target.value) || 0;
        if (e.target.classList.contains('pl-n')) pileLayers[e.target.dataset.idx].n_val = parseFloat(e.target.value) || 0;
        if (e.target.classList.contains('pl-c')) pileLayers[e.target.dataset.idx].c_val = parseFloat(e.target.value) || 0;
        localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers));
    });

    container.addEventListener('click', (e) => {
        if (e.target.id === 'pile_layer_add') {
            pileLayers.push({ name: '신규지층', type: 'sand', dz: 3.0, n_val: 30, c_val: 0 });
            localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers));
            renderLayers();
        }
        if (e.target.classList.contains('pl-del')) {
            pileLayers.splice(e.target.dataset.idx, 1);
            localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers));
            renderLayers();
        }
    });

    container.querySelector('#calc-pile-btn').addEventListener('click', calculatePileCapacity);
}

function calculatePileCapacity() {
    const p_type = document.getElementById('pile_type').value;
    const method = document.getElementById('pile_method').value;
    const D = parseFloat(document.getElementById('pile_D').value);
    const t = parseFloat(document.getElementById('pile_t').value);
    const L = parseFloat(document.getElementById('pile_L').value);
    const joint_type = document.getElementById('pile_joint_type').value;
    const joint_cnt = parseInt(document.getElementById('pile_joint_count').value) || 0;
    const mat_qa_base = parseFloat(document.getElementById('pile_mat_qa').value);
    const N_tip_in = parseFloat(document.getElementById('pile_N_tip').value);

    const P_norm = parseFloat(document.getElementById('pile_P_norm').value);
    const P_seis = parseFloat(document.getElementById('pile_P_seis').value);

    let pileLayers = JSON.parse(localStorage.getItem('geo_pile_layers')) || [];

    // ---------------------------------------------------------
    // 1. 선단지지력 (Qup) 산정
    // ---------------------------------------------------------
    let N_tip = Math.min(N_tip_in, 50); // 설계 N치 상한 50 적용
    const Ap = (Math.PI * Math.pow(D, 2)) / 4.0; // 단면적 (폐색/외경 기준)
    
    // 시공법별 계수 선택 (도로설계편람/구조물기초설계기준)
    let alpha_p = 200; 
    if (method === 'driven') alpha_p = 300;
    else if (method === 'bored_solid' || method === 'bored_final') alpha_p = 250;

    const Qup = alpha_p * N_tip * Ap;

    // ---------------------------------------------------------
    // 2. 주면마찰력 (Qus) 산정
    // ---------------------------------------------------------
    const As = Math.PI * D; // 말뚝 둘레 (m)
    let total_Qus = 0;
    let layer_calc_rows = [];

    pileLayers.forEach(l => {
        let f_unit = 0;
        let formula_str = "";
        
        if (l.type === 'sand') {
            // 사질토/풍화암 매입 기준: f = 2N (<= 100)
            f_unit = Math.min(2.0 * l.n_val, 100.0);
            formula_str = `2 &times; ${l.n_val}`;
        } else {
            // 점성토 매입 기준: f = 0.8c 또는 8N (<= 150)
            let f_c = 0.8 * l.c_val;
            let f_n = 8.0 * l.n_val;
            f_unit = Math.min(Math.max(f_c, f_n), 150.0);
            formula_str = `min(0.8c, 8N)`;
        }

        let fxL = f_unit * l.dz;
        let Qus_i = fxL * As;
        total_Qus += Qus_i;

        layer_calc_rows.push({
            name: l.name,
            dz: l.dz,
            n_val: l.n_val,
            c_val: l.c_val,
            formula: formula_str,
            fxL: fxL,
            qusi: Qus_i
        });
    });

    // ---------------------------------------------------------
    // 3. 지반에 의한 허용지지력 (Qa_soil) 산정
    // ---------------------------------------------------------
    const Qu_total = Qup + total_Qus;
    const Qa_soil_norm = Qu_total / 3.0; // 평상시 FS = 3.0
    const Qa_soil_seis = Qa_soil_norm * 1.25; // 내진시 (평상시의 1.25배 적용)

    // ---------------------------------------------------------
    // 4. 말뚝재료에 의한 허용지지력 (Qas) 산정
    // ---------------------------------------------------------
    // 장경비 L/D 및 한계치 n 설정
    const L_over_D = L / D;
    let n_limit = 85; // PHC 기준 기본값
    if (p_type === 'PC') n_limit = 80;
    else if (p_type === 'RC') n_limit = 70;
    else if (p_type === 'STEEL') n_limit = 100;
    else if (p_type === 'CAST') n_limit = 60;

    let mu1 = Math.max(0, L_over_D - n_limit); // 장경비 저감율 (%)

    // 이음 저감율 mu2
    let mu2_base = 0;
    if (joint_type === 'weld') mu2_base = 5.0;
    else if (joint_type === 'bolt') mu2_base = 10.0;
    
    // 매입공법 시 이음 저감율 1/2 적용
    let mu2 = (method.includes('bored') || method === 'cement_paste') ? (mu2_base * 0.5 * joint_cnt) : (mu2_base * joint_cnt);

    const Qas_norm = (1.0 - (mu1 + mu2) / 100.0) * mat_qa_base;
    const Qas_seis = Qas_norm * 1.50; // 내진시 재료 허용력 1.5배 적용

    // ---------------------------------------------------------
    // 5. 최종 허용지지력 결정 및 안전성 검토
    // ---------------------------------------------------------
    const Q_app_norm = Math.min(Qa_soil_norm, Qas_norm);
    const Q_app_seis = Math.min(Qa_soil_seis, Qas_seis);

    const status_norm = P_norm <= Q_app_norm ? "안정 (O.K)" : "NG";
    const status_seis = P_seis <= Q_app_seis ? "안정 (O.K)" : "NG";

    // ---------------------------------------------------------
    // 6. 결과 렌더링
    // ---------------------------------------------------------
    const resultDiv = document.getElementById('pile-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div class="section-title">[말뚝기초 연직지지력 최종 검토 요약]</div>
        <div class="table-container">
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>구분</th>
                        <th>지반 허용지지력 (kN)</th>
                        <th>재료 허용지지력 (kN)</th>
                        <th>적용 허용지지력 (kN)</th>
                        <th>작용하중 (kN)</th>
                        <th>검토 결과</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>평상시 (상시)</strong></td>
                        <td>${Qa_soil_norm.toFixed(1)}</td>
                        <td>${Qas_norm.toFixed(1)}</td>
                        <td style="font-weight:bold; color:#2980b9;">${Q_app_norm.toFixed(1)}</td>
                        <td>${P_norm.toFixed(1)}</td>
                        <td style="font-weight:bold; color:${status_norm.includes('안정') ? '#27ae60' : '#c0392b'};">${status_norm}</td>
                    </tr>
                    <tr>
                        <td><strong>내진시 (지진시)</strong></td>
                        <td>${Qa_soil_seis.toFixed(1)}</td>
                        <td>${Qas_seis.toFixed(1)}</td>
                        <td style="font-weight:bold; color:#2980b9;">${Q_app_seis.toFixed(1)}</td>
                        <td>${P_seis.toFixed(1)}</td>
                        <td style="font-weight:bold; color:${status_seis.includes('안정') ? '#27ae60' : '#c0392b'};">${status_seis}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section-title">1. 지반에 의한 허용지지력 산정 상세 (SPT 기반)</div>
        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
            <strong>(1) 말뚝 선단지지력 (Q<sub>up</sub>)</strong><br>
            • 선단면적 A<sub>p</sub> = &pi; &times; D² / 4 = &pi; &times; ${D.toFixed(3)}² / 4 = <strong>${Ap.toFixed(5)} m²</strong><br>
            • 적용 산정식 : Q<sub>up</sub> = ${alpha_p} &times; N &times; A<sub>p</sub><br>
            • Q<sub>up</sub> = ${alpha_p} &times; ${N_tip} &times; ${Ap.toFixed(5)} = <span style="font-weight:bold; color:#8e44ad;">${Qup.toFixed(1)} kN</span><br><br>

            <strong>(2) 말뚝 주면마찰력 (Q<sub>us</sub>)</strong><br>
            • 말뚝 둘레 A<sub>s</sub> = &pi; &times; D = &pi; &times; ${D.toFixed(3)} = <strong>${As.toFixed(3)} m</strong><br>
            • 총 주면마찰력 Q<sub>us</sub> = &sum; (f &times; L) &times; A<sub>s</sub> = <strong>${total_Qus.toFixed(1)} kN</strong>
        </div>

        <div class="table-container" style="margin-bottom: 15px;">
            <table class="result-table" style="font-size: 0.8em; text-align: center;">
                <thead>
                    <tr style="background-color: #eaeded;">
                        <th>지층명</th>
                        <th>층후 L (m)</th>
                        <th>평균 N치</th>
                        <th>단위 마찰력 f (kN/m²)</th>
                        <th>f &times; L</th>
                        <th>층별 주면마찰력 Q<sub>us,i</sub> (kN)</th>
                    </tr>
                </thead>
                <tbody>
                    ${layer_calc_rows.map(r => `
                        <tr>
                            <td>${r.name}</td>
                            <td>${r.dz.toFixed(2)}</td>
                            <td>${r.n_val}</td>
                            <td>${r.formula}</td>
                            <td>${r.fxL.toFixed(1)}</td>
                            <td style="font-weight:bold;">${r.qusi.toFixed(1)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background-color: #f5eef8; font-weight: bold;">
                        <td colspan="5">주면마찰력 합계 (&sum;)</td>
                        <td style="color:#27ae60;">${total_Qus.toFixed(1)} kN</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px;">
            <strong>(3) 지반 허용지지력 (Q<sub>a,soil</sub>)</strong><br>
            • 평상시 (F.S = 3.0) : (Q<sub>up</sub> + Q<sub>us</sub>) / 3.0 = (${Qup.toFixed(1)} + ${total_Qus.toFixed(1)}) / 3.0 = <strong>${Qa_soil_norm.toFixed(1)} kN</strong><br>
            • 내진시 : 평상시 허용지지력 &times; 1.25 = ${Qa_soil_norm.toFixed(1)} &times; 1.25 = <strong>${Qa_soil_seis.toFixed(1)} kN</strong>
        </div>

        <div class="section-title">2. 말뚝 재료에 의한 허용지지력 산정 상세</div>
        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px;">
            • 산정 공식 : Q<sub>as</sub> = [1 - (&mu;<sub>1</sub> + &mu;<sub>2</sub>)/100] &times; Q<sub>mat_base</sub><br>
            • 장경비 L/D = ${L.toFixed(1)} / ${D.toFixed(3)} = ${L_over_D.toFixed(2)} (상한 한계치 n = ${n_limit}) &rarr; 장경비 저감율 &mu;<sub>1</sub> = <strong>${mu1.toFixed(1)} %</strong><br>
            • 이음 저감율 &mu;<sub>2</sub> = <strong>${mu2.toFixed(1)} %</strong> (${joint_type === 'none' ? '이음없음' : joint_type + ' ' + joint_cnt + '개소'})<br>
            • 평상시 재료 허용지지력 Q<sub>as,norm</sub> = [1 - ${(mu1 + mu2).toFixed(1)}/100] &times; ${mat_qa_base.toFixed(1)} = <strong>${Qas_norm.toFixed(1)} kN</strong><br>
            • 내진시 재료 허용지지력 Q<sub>as,seis</sub> = Q<sub>as,norm</sub> &times; 1.50 = <strong>${Qas_seis.toFixed(1)} kN</strong>
        </div>
    `;
}
