export function initPileModule(container) {
    const getVal = (id, defaultVal) => localStorage.getItem('geo_pile_' + id) ?? defaultVal;

    // 말뚝 종류별 기본 허용압축응력(MPa) 구하기
    const getDefaultSigmaCa = (type) => {
        if (type === 'STEEL') return '240.0';
        if (type === 'CAST') return '35.0';
        return '80.0'; // PHC, PC, RC
    };

    // 초기 지층 데이터
    let pileLayers = JSON.parse(localStorage.getItem('geo_pile_layers'));
    if (!pileLayers || !Array.isArray(pileLayers) || pileLayers.length === 0) {
        pileLayers = [
            { name: '풍화토(N>40)', type: 'sand', dz: 4.40, n_val: 40, c_val: 25.0 },
            { name: '풍화암', type: 'sand', dz: 5.60, n_val: 40, c_val: 32.0 }
        ];
        localStorage.setItem('geo_pile_layers', JSON.stringify(pileLayers));
    }

    // 지층 층후 합산으로 말뚝 총 길이 L 계산
    const calcTotalL = () => pileLayers.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);

    const initialType = getVal('type', 'PHC');
    const initialT1 = parseFloat(getVal('t1', '1.0')).toFixed(1);
    const initialSigmaCa = getVal('sigma_ca', getDefaultSigmaCa(initialType));

    container.innerHTML = `
        <h3>1. 설계자료 입력 (말뚝기초 연직지지력 검토)</h3>
        
        <!-- 1. 말뚝기초 제원 및 시공 조건 -->
        <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 0.95em;">■ 말뚝기초 제원 및 시공 조건</div>
        <div class="input-grid" style="margin-bottom: 15px;">
            <div class="input-group">
                <label>말뚝 종류 <span id="t1_label_hint" style="display: ${initialType === 'STEEL' ? 'inline' : 'none'};">/ 부식두께(mm)</span></label>
                <div style="display: flex; gap: 4px; align-items: stretch; width: 100%; height: 32px;">
                    <select id="pile_type" style="flex: 1; min-width: 0; height: 100%; box-sizing: border-box; padding: 4px 6px; border: 1px solid #ccc; border-radius: 3px; font-size: 0.9em;">
                        <option value="PHC" ${initialType === 'PHC' ? 'selected' : ''}>PHC 말뚝</option>
                        <option value="PC" ${initialType === 'PC' ? 'selected' : ''}>PC 말뚝</option>
                        <option value="RC" ${initialType === 'RC' ? 'selected' : ''}>RC 말뚝</option>
                        <option value="STEEL" ${initialType === 'STEEL' ? 'selected' : ''}>강관 말뚝</option>
                        <option value="CAST" ${initialType === 'CAST' ? 'selected' : ''}>현장타설말뚝</option>
                    </select>
                    <input type="number" id="pile_t1" value="${initialT1}" step="0.1" title="부식두께(mm)" placeholder="t1" style="display: ${initialType === 'STEEL' ? 'block' : 'none'}; width: 65px; height: 100%; text-align: center; border: 1px solid #ccc; border-radius: 3px; background-color: #fff; box-sizing: border-box; padding: 4px; font-size: 0.9em;">
                </div>
            </div>

            <div class="input-group">
                <label>시공 공법</label>
                <select id="pile_method" style="width: 100%; height: 32px; box-sizing: border-box; padding: 4px 6px; border: 1px solid #ccc; border-radius: 3px; font-size: 0.9em;">
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
                <label>허용압축응력 σ_ca (MPa)</label>
                <input type="number" id="pile_sigma_ca" value="${initialSigmaCa}" step="0.1">
            </div>
        </div>

        <!-- 2. 작용 하중 입력 -->
        <div style="font-weight: bold; margin-bottom: 8px; color: #d35400; font-size: 0.95em;">■ 작용 하중 (상부구조 반력)</div>
        <div class="input-grid" style="margin-bottom: 15px; background-color: #fdf2e9; padding: 10px; border-radius: 5px; border: 1px solid #edbb99;">
            <div class="input-group" style="background:#fff;">
                <label style="color:#d35400;">평상시 P_norm (kN/본)</label>
                <input type="number" id="pile_P_norm" value="${getVal('P_norm', '2062.8')}" step="0.1">
            </div>
            <div class="input-group" style="background:#fff;">
                <label style="color:#c0392b;">내진시 P_seis (kN/본)</label>
                <input type="number" id="pile_P_seis" value="${getVal('P_seis', '1728.6')}" step="0.1">
            </div>
        </div>

        <!-- 3. 주면마찰력 산정을 위한 지층 정보 -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-weight: bold; color: #27ae60; font-size: 0.95em;">■ 지층 정보 (최하단 지층 평균 N치가 선단지지력에 자동 사용됨)</div>
            <button type="button" id="pile_layer_add" style="padding: 4px 10px; background: #27ae60; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85em; font-weight: bold;">+ 지층 추가</button>
        </div>
        
        <div style="background-color: #e8f8f5; padding: 12px; border-radius: 6px; border: 1px solid #a3e4d7; margin-bottom: 15px;">
            <div class="table-container" style="margin: 0;">
                <table class="result-table" style="font-size: 0.85em; text-align: center; margin: 0; width: 100%; table-layout: fixed;">
                    <thead>
                        <tr style="background-color: #d1f2eb;">
                            <th style="width: 24%; padding: 6px;">지층명</th>
                            <th style="width: 24%; padding: 6px;">토성 구분</th>
                            <th style="width: 16%; padding: 6px;">층후 L (m)</th>
                            <th style="width: 14%; padding: 6px;">평균 N치</th>
                            <th style="width: 14%; padding: 6px;">점착력 c (kN/m²)</th>
                            <th style="width: 8%; padding: 6px;">삭제</th>
                        </tr>
                    </thead>
                    <tbody id="pile_layers_body">
                        <!-- 동적 생성 렌더링 -->
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #ebf5fb; font-weight: bold; border-top: 2px solid #a3e4d7;">
                            <td colspan="2" style="padding: 8px 6px; text-align: right; color: #2980b9;">말뚝 총 길이 L (m) :</td>
                            <td id="pile_L_val" style="padding: 8px 6px; color: #16a085; font-size: 1.05em; text-align: center;">${calcTotalL().toFixed(2)}</td>
                            <td colspan="3" style="padding: 8px 6px; text-align: left; color: #7f8c8d; font-size: 0.85em;">(지층 층후 자동 합산)</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <button class="action-btn" id="calc-pile-btn" style="margin-top: 10px;">말뚝 연직지지력 산정 및 검토</button>
        <div id="pile-result" class="result-box"></div>
    `;

    function updatePileLength() {
        const totalL = calcTotalL();
        const pileLVal = document.getElementById('pile_L_val');
        if (pileLVal) {
            pileLVal.textContent = totalL.toFixed(2);
            localStorage.setItem('geo_pile_L', totalL.toFixed(2));
        }
    }

    function renderLayers() {
        const tbody = document.getElementById('pile_layers_body');
        if (!tbody) return;
        tbody.innerHTML = '';
        pileLayers.forEach((l, idx) => {
            tbody.innerHTML += `
                <tr>
                    <td style="padding:4px;"><input type="text" value="${l.name}" data-idx="${idx}" class="pl-name" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;">
                        <select data-idx="${idx}" class="pl-type" style="width:100%; box-sizing:border-box; padding:4px;">
                            <option value="sand" ${l.type === 'sand' ? 'selected' : ''}>사질토 / 풍화암</option>
                            <option value="clay" ${l.type === 'clay' ? 'selected' : ''}>점성토</option>
                        </select>
                    </td>
                    <td style="padding:4px;"><input type="number" value="${l.dz.toFixed(2)}" data-idx="${idx}" class="pl-dz" step="0.1" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><input type="number" value="${l.n_val}" data-idx="${idx}" class="pl-n" step="1" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><input type="number" value="${l.c_val.toFixed(1)}" data-idx="${idx}" class="pl-c" step="0.5" style="width:100%; box-sizing:border-box; padding:4px; text-align:center;"></td>
                    <td style="padding:4px;"><button type="button" class="pl-del" data-idx="${idx}" style="padding:3px 8px; background:#e74c3c; color:#fff; border:none; border-radius:3px; cursor:pointer;">-</button></td>
                </tr>
            `;
        });
        updatePileLength();
    }
    renderLayers();

    // 말뚝 종류 변경 시 부식두께 토글 및 허용응력 기본값 자동 채우기
    const pileTypeSelect = document.getElementById('pile_type');
    pileTypeSelect.addEventListener('change', function() {
        const corrInput = document.getElementById('pile_t1');
        const hint = document.getElementById('t1_label_hint');
        const sigmaInput = document.getElementById('pile_sigma_ca');

        if (this.value === 'STEEL') {
            corrInput.style.display = 'block';
            if (hint) hint.style.display = 'inline';
        } else {
            corrInput.style.display = 'none';
            if (hint) hint.style.display = 'none';
        }

        // 말뚝 종류별 기본 허용응력 자동 세팅
        const defaultSigma = getDefaultSigmaCa(this.value);
        if (sigmaInput) {
            sigmaInput.value = defaultSigma;
            localStorage.setItem('geo_pile_sigma_ca', defaultSigma);
        }

        localStorage.setItem('geo_pile_type', this.value);
    });

    // 부식두께(t1) blur 이벤트 (소수점 첫째 자리 포맷팅)
    const t1Input = container.querySelector('#pile_t1');
    if (t1Input) {
        t1Input.addEventListener('blur', function() {
            let val = parseFloat(this.value);
            if (!isNaN(val)) {
                this.value = val.toFixed(1);
                localStorage.setItem('geo_pile_t1', this.value);
            }
        });
    }

    // 일반 입력 필드 저장 이벤트
    const inputs = container.querySelectorAll('.input-grid input, .input-grid select');
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            let key = this.id.replace('pile_', '');
            localStorage.setItem('geo_pile_' + key, this.value);
        });
    });

    // 지층 정보 수정 이벤트 및 L 자동 연동
    container.addEventListener('change', (e) => {
        if (e.target.classList.contains('pl-name')) pileLayers[e.target.dataset.idx].name = e.target.value;
        if (e.target.classList.contains('pl-type')) pileLayers[e.target.dataset.idx].type = e.target.value;
        if (e.target.classList.contains('pl-dz')) {
            pileLayers[e.target.dataset.idx].dz = parseFloat(e.target.value) || 0;
            updatePileLength();
        }
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
    const t_mm = parseFloat(document.getElementById('pile_t').value);
    
    // 강관말뚝일 때만 부식두께 t1 적용
    let t1_mm = 0;
    if (p_type === 'STEEL') {
        t1_mm = parseFloat(document.getElementById('pile_t1').value) || 0;
    }

    let pileLayers = JSON.parse(localStorage.getItem('geo_pile_layers')) || [];
    const L = pileLayers.reduce((sum, l) => sum + (parseFloat(l.dz) || 0), 0);

    const joint_type = document.getElementById('pile_joint_type').value;
    const joint_cnt = parseInt(document.getElementById('pile_joint_count').value) || 0;
    const sigma_ca = parseFloat(document.getElementById('pile_sigma_ca').value); // MPa

    const P_norm = parseFloat(document.getElementById('pile_P_norm').value);
    const P_seis = parseFloat(document.getElementById('pile_P_seis').value);

    // ---------------------------------------------------------
    // 1. 선단지지력 (Qup) 산정 : 최하단 지층 평균 N치 자동 활용
    // ---------------------------------------------------------
    let lastLayer = pileLayers.length > 0 ? pileLayers[pileLayers.length - 1] : { name: '지지층', n_val: 50 };
    let raw_N_tip = parseFloat(lastLayer.n_val) || 0;
    let N_tip = Math.min(raw_N_tip, 50); // 설계 N치 상한 50 적용[cite: 3]

    const Ap = (Math.PI * Math.pow(D, 2)) / 4.0; // 선단 지지면적 (m²)
    
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
            f_unit = Math.min(2.0 * l.n_val, 100.0);
            formula_str = `2 &times; ${l.n_val}`;
        } else {
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
    const Qa_soil_norm = Qu_total / 3.0; // FS = 3.0
    const Qa_soil_seis = Qa_soil_norm * 1.25;

    // ---------------------------------------------------------
    // 4. 말뚝재료에 의한 허용지지력 (Qas) 산정
    // ---------------------------------------------------------
    const t_eff_m = Math.max(0, (t_mm - t1_mm)) / 1000.0;
    const A_net = Math.PI * (D - t_eff_m) * t_eff_m; // 유효 단면적 (m²)

    const Q_mat_base = sigma_ca * 1000.0 * A_net; // (MPa -> kPa 변환)

    // 장경비 L/D 및 한계치 n 설정[cite: 3]
    const L_over_D = L / D;
    let n_limit = 85; 
    if (p_type === 'PC') n_limit = 80;
    else if (p_type === 'RC') n_limit = 70;
    else if (p_type === 'STEEL') n_limit = 100;
    else if (p_type === 'CAST') n_limit = 60;

    let mu1 = Math.max(0, L_over_D - n_limit); // 장경비 저감율 (%)

    // 이음 저감율 mu2[cite: 3]
    let mu2_base = 0;
    if (joint_type === 'weld') mu2_base = 5.0;
    else if (joint_type === 'bolt') mu2_base = 10.0;
    
    let mu2 = (method.includes('bored') || method === 'cement_paste') ? (mu2_base * 0.5 * joint_cnt) : (mu2_base * joint_cnt);

    const Qas_norm = (1.0 - (mu1 + mu2) / 100.0) * Q_mat_base;
    const Qas_seis = Qas_norm * 1.50;

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
    const resultDiv = document.getElementById('settlement-result') || document.getElementById('pile-result');
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

        <!-- 검증 1: 지반에 의한 지지력 -->
        <div class="section-title">[검증 1] 지반에 의한 연직 허용지지력 산정 (구조물기초설계기준 해설)</div>
        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 12px;">
            <strong>(1) 말뚝 선단지지력 (Q<sub>up</sub>)</strong><br>
            • 선단지층 : <strong>${lastLayer.name}</strong> (평균 N치 = ${raw_N_tip} &rarr; 설계 N치 = <strong>${N_tip}</strong> [상한 50 적용])<br>
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

        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 20px;">
            <strong>(3) 지반 허용지지력 (Q<sub>a,soil</sub>)</strong><br>
            • 평상시 (F.S = 3.0) : (Q<sub>up</sub> + Q<sub>us</sub>) / 3.0 = (${Qup.toFixed(1)} + ${total_Qus.toFixed(1)}) / 3.0 = <strong>${Qa_soil_norm.toFixed(1)} kN</strong><br>
            • 내진시 : 평상시 허용지지력 &times; 1.25 = ${Qa_soil_norm.toFixed(1)} &times; 1.25 = <strong>${Qa_soil_seis.toFixed(1)} kN</strong>
        </div>

        <!-- 검증 2: 말뚝 재료에 의한 허용압축하중 -->
        <div class="section-title">[검증 2] 말뚝 재료에 의한 허용압축하중 산정 (구조물기초설계기준 해설)</div>
        <div class="calc-step" style="background-color: #fcfcfc; padding: 12px; border: 1px solid #d5d8dc; border-radius: 4px; margin-bottom: 15px;">
            • 유효 두께 t<sub>eff</sub> : ${t_mm.toFixed(1)}mm ${p_type === 'STEEL' ? '- 부식두께 ' + t1_mm.toFixed(1) + 'mm = ' + (t_mm - t1_mm).toFixed(1) + 'mm' : ''}<br>
            • 유효 단면적 A<sub>net</sub> = &pi; &times; (D - t<sub>eff</sub>) &times; t<sub>eff</sub> = &pi; &times; (${D.toFixed(3)} - ${t_eff_m.toFixed(4)}) &times; ${t_eff_m.toFixed(4)} = <strong>${A_net.toFixed(5)} m²</strong><br>
            • 기본 허용압축하중 Q<sub>mat_base</sub> = &sigma;<sub>ca</sub> &times; A<sub>net</sub> = ${sigma_ca.toFixed(1)} MPa &times; ${A_net.toFixed(5)} m² &times; 1000 = <strong>${Q_mat_base.toFixed(1)} kN</strong><br><br>
            • 산정 공식 : Q<sub>as</sub> = [1 - (&mu;<sub>1</sub> + &mu;<sub>2</sub>)/100] &times; Q<sub>mat_base</sub><br>
            • 장경비 L/D = ${L.toFixed(2)} / ${D.toFixed(3)} = ${L_over_D.toFixed(2)} (상한 한계치 n = ${n_limit}) &rarr; 장경비 저감율 &mu;<sub>1</sub> = <strong>${mu1.toFixed(1)} %</strong><br>
            • 이음 저감율 &mu;<sub>2</sub> = <strong>${mu2.toFixed(1)} %</strong> (${joint_type === 'none' ? '이음없음' : joint_type + ' ' + joint_cnt + '개소'})<br>
            • 평상시 재료 허용압축하중 Q<sub>as,norm</sub> = [1 - ${(mu1 + mu2).toFixed(1)}/100] &times; ${Q_mat_base.toFixed(1)} = <strong>${Qas_norm.toFixed(1)} kN</strong><br>
            • 내진시 재료 허용압축하중 Q<sub>as,seis</sub> = Q<sub>as,norm</sub> &times; 1.50 = <strong>${Qas_seis.toFixed(1)} kN</strong>
        </div>

        <!-- 기준 표 추가 1: 장경비에 의한 허용응력 감소 한계치 -->
        <div style="font-weight: bold; margin-bottom: 6px; color: #2c3e50; font-size: 0.85em;">■ 표 3. 장경비에 의한 허용응력 감소의 한계치 (구조물기초설계기준 해설 표 5.2.3)</div>
        <div class="table-container" style="margin-bottom: 15px;">
            <table class="result-table" style="font-size: 0.8em; text-align: center;">
                <thead>
                    <tr style="background-color: #eaeded;">
                        <th>구 분</th>
                        <th>RC말뚝</th>
                        <th>PC말뚝</th>
                        <th>PHC말뚝</th>
                        <th>강관말뚝</th>
                        <th>현장타설말뚝</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>n</strong></td>
                        <td style="${p_type === 'RC' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">70</td>
                        <td style="${p_type === 'PC' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">80</td>
                        <td style="${p_type === 'PHC' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">85</td>
                        <td style="${p_type === 'STEEL' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">100</td>
                        <td style="${p_type === 'CAST' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">60</td>
                    </tr>
                    <tr>
                        <td><strong>장경비의 상한계<sup>1)</sup></strong></td>
                        <td style="${p_type === 'RC' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">90</td>
                        <td style="${p_type === 'PC' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">105</td>
                        <td style="${p_type === 'PHC' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">110</td>
                        <td style="${p_type === 'STEEL' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">130</td>
                        <td style="${p_type === 'CAST' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">80</td>
                    </tr>
                </tbody>
            </table>
            <p style="font-size:0.75em; color:#7f8c8d; margin-top:4px; margin-bottom:12px;">주1) 장경비에 의한 말뚝재료 허용응력 감소를 감안하더라도, 장경비 상한계 이상의 설계는 하지 않는 것이 좋다.</p>
        </div>

        <!-- 기준 표 추가 2: 말뚝이음에 의한 허용하중 감소율 -->
        <div style="font-weight: bold; margin-bottom: 6px; color: #2c3e50; font-size: 0.85em;">■ 표 4. 말뚝이음에 의한 허용하중 감소율 (구조물기초설계기준 해설 표 5.2.2)</div>
        <div class="table-container">
            <table class="result-table" style="font-size: 0.8em; text-align: center;">
                <thead>
                    <tr style="background-color: #eaeded;">
                        <th>이음방법</th>
                        <th>용접이음</th>
                        <th>볼트식 이음</th>
                        <th>비고</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>감소율</strong></td>
                        <td style="${joint_type === 'weld' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">5% / 개소</td>
                        <td style="${joint_type === 'bolt' ? 'background-color:#e8f8f5; font-weight:bold; color:#16a085;' : ''}">10% / 개소</td>
                        <td style="text-align:left; font-size:0.85em; padding:4px 8px;">매입말뚝 경우에는 이음부 손상이 거의 없으므로 이음방법별 감소율 절반(1/2) 적용</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}
