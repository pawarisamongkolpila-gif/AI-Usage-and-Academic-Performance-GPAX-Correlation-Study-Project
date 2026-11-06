// app.js - Main Application Controller for Group 45 SUT AI Research Web App
// JASP / Excel Aligned & Enhanced Robust UX

const App = {
  data: null,
  filteredStudents: [],
  currentView: 'landing',
  currentDashTab: 'overview',
  
  filters: {
    faculty: 'all',
    year: 'all',
    gpaxBucket: 'all',
    dependency: 'all',
    gender: 'all'
  },

  async init() {
    console.log("Initializing App...");
    if (window.RESEARCH_DATA) {
      this.data = window.RESEARCH_DATA;
    } else {
      try {
        const res = await fetch('data.json');
        this.data = await res.json();
      } catch (err) {
        console.error("Failed to load dataset:", err);
        return;
      }
    }

    this.filteredStudents = [...this.data.students];
    this.populateFilterDropdowns();
    this.bindEvents();
    this.initContributeForm();
    this.renderView('landing');
  },

  populateFilterDropdowns() {
    const facultySelect = document.getElementById('filter-faculty');
    const yearSelect = document.getElementById('filter-year');
    const genderSelect = document.getElementById('filter-gender');

    if (facultySelect && this.data.summary.faculties) {
      facultySelect.innerHTML = '<option value="all">ทุกสำนักวิชา (9 สำนัก)</option>';
      Object.keys(this.data.summary.faculties).forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f + ' (' + this.data.summary.faculties[f] + ')';
        facultySelect.appendChild(opt);
      });
    }

    if (yearSelect && this.data.summary.years) {
      yearSelect.innerHTML = '<option value="all">ทุกชั้นปี</option>';
      ['ปี 1', 'ปี 2', 'ปี 3', 'ปี 4', 'ปี 5 ขึ้นไป'].forEach(y => {
        if (this.data.summary.years[y]) {
          const opt = document.createElement('option');
          opt.value = y;
          opt.textContent = y + ' (' + this.data.summary.years[y] + ')';
          yearSelect.appendChild(opt);
        }
      });
    }

    if (genderSelect && this.data.summary.genders) {
      genderSelect.innerHTML = '';
      const genderOpts = [
        { val: 'all', label: 'ทุกเพศ (ทั้งหมด)' },
        { val: 'ชาย', label: 'ชาย (' + (this.data.summary.genders['ชาย'] || 0) + ')' },
        { val: 'หญิง', label: 'หญิง (' + (this.data.summary.genders['หญิง'] || 0) + ')' },
        { val: 'อื่น ๆ / ไม่ระบุ', label: 'อื่น ๆ / ไม่ระบุ (' + (this.data.summary.genders['อื่น ๆ / ไม่ระบุ'] || 0) + ')' }
      ];
      genderOpts.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.val;
        opt.textContent = g.label;
        genderSelect.appendChild(opt);
      });
    }
  },

  bindEvents() {
    // Navigation Links
    document.querySelectorAll('[data-target-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = btn.getAttribute('data-target-view');
        const targetTab = btn.getAttribute('data-target-tab');
        this.renderView(targetView);
        if (targetTab) {
          this.switchDashTab(targetTab);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    // Dashboard Sub-Tabs
    document.querySelectorAll('.dash-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabKey = btn.getAttribute('data-tab');
        this.switchDashTab(tabKey);
      });
    });

    // Filter controls
    const filterIds = ['filter-faculty', 'filter-year', 'filter-gpax', 'filter-dep', 'filter-gender'];
    filterIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.applyFilters());
      }
    });

    const resetBtn = document.getElementById('btn-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetFilters());
    }
  },

  renderView(viewName) {
    this.currentView = viewName;
    
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active-view');
    });
    const activeSection = document.getElementById('view-' + viewName);
    if (activeSection) {
      activeSection.classList.add('active-view');
    }

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-target-view') === viewName) {
        link.classList.add('active');
      }
    });

    if (viewName === 'dashboard') {
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.refreshCurrentDashboardTab();
        }, 50);
      });
    } else if (viewName === 'contribute') {
      this.updateContributeStats();
    }
  },

  switchDashTab(tabKey) {
    this.currentDashTab = tabKey;

    document.querySelectorAll('.dash-tab-btn').forEach(b => {
      b.classList.remove('active');
      if (b.getAttribute('data-tab') === tabKey) {
        b.classList.add('active');
      }
    });

    document.querySelectorAll('.dash-tab-content').forEach(c => {
      c.classList.remove('active');
    });
    const targetContent = document.getElementById('tab-' + tabKey);
    if (targetContent) {
      targetContent.classList.add('active');
    }

    // Lock/dim filter bar on tabs 4 and 5 (performance & segments)
    const filterBar = document.querySelector('.sticky-filter-bar');
    const filterNotice = document.getElementById('filter-locked-notice');
    if (tabKey === 'performance' || tabKey === 'segments') {
      if (filterBar) filterBar.classList.add('filter-bar-disabled');
      if (filterNotice) filterNotice.style.display = 'none'; // Notice removed as requested
    } else {
      if (filterBar) filterBar.classList.remove('filter-bar-disabled');
      if (filterNotice) filterNotice.style.display = 'none';
    }

    // Ensure DOM has reflowed before drawing Chart.js canvas
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.refreshCurrentDashboardTab();
      }, 50);
    });
  },

  applyFilters() {
    const faculty = document.getElementById('filter-faculty')?.value || 'all';
    const year = document.getElementById('filter-year')?.value || 'all';
    const gpaxBucket = document.getElementById('filter-gpax')?.value || 'all';
    const dep = document.getElementById('filter-dep')?.value || 'all';
    const gender = document.getElementById('filter-gender')?.value || 'all';

    this.filters = { faculty, year, gpaxBucket, dependency: dep, gender };

    this.filteredStudents = this.data.students.filter(s => {
      if (faculty !== 'all' && s.faculty !== faculty) return false;
      if (year !== 'all' && s.year !== year) return false;
      if (gpaxBucket !== 'all' && s.gpaxBucket !== gpaxBucket) return false;
      if (dep !== 'all' && Math.round(s.dependency) !== parseInt(dep)) return false;
      if (gender !== 'all' && s.gender !== gender) return false;
      return true;
    });

    const badge = document.getElementById('filtered-count');
    if (badge) {
      badge.textContent = this.filteredStudents.length + ' / ' + this.data.students.length + ' คน';
    }

    this.refreshCurrentDashboardTab();
  },

  resetFilters() {
    ['filter-faculty', 'filter-year', 'filter-gpax', 'filter-dep', 'filter-gender'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'all';
    });
    this.applyFilters();
  },

  refreshCurrentDashboardTab() {
    if (!this.data) return;

    const emptyNotice = document.getElementById('dash-empty-state');
    const contentContainers = document.querySelectorAll('.dash-tab-content');

    if (this.filteredStudents.length === 0 && (this.currentDashTab === 'overview' || this.currentDashTab === 'usage' || this.currentDashTab === 'dependency')) {
      if (emptyNotice) emptyNotice.style.display = 'block';
      contentContainers.forEach(el => {
        if (el.id === 'tab-' + this.currentDashTab) el.style.opacity = '0.2';
      });
      return;
    } else {
      if (emptyNotice) emptyNotice.style.display = 'none';
      contentContainers.forEach(el => el.style.opacity = '1.0');
    }

    try {
      if (this.currentDashTab === 'overview') {
        this.renderOverviewTab();
      } else if (this.currentDashTab === 'usage') {
        this.renderUsageTab();
      } else if (this.currentDashTab === 'dependency') {
        this.renderDependencyTab();
      } else if (this.currentDashTab === 'performance') {
        this.renderPerformanceTab();
      } else if (this.currentDashTab === 'segments') {
        this.renderSegmentsTab();
      }
    } catch (e) {
      console.error("Error refreshing dashboard tab " + this.currentDashTab, e);
    }
  },

  renderOverviewTab() {
    const facultyCounts = {};
    const yearCounts = {};
    const toolsCounts = {};

    this.filteredStudents.forEach(s => {
      facultyCounts[s.faculty] = (facultyCounts[s.faculty] || 0) + 1;
      yearCounts[s.year] = (yearCounts[s.year] || 0) + 1;
      (s.tools || []).forEach(t => {
        toolsCounts[t] = (toolsCounts[t] || 0) + 1;
      });
    });

    ChartManager.renderFacultyChart('chart-overview-faculty', facultyCounts);
    ChartManager.renderYearChart('chart-overview-year', yearCounts);
    // Real-GPAX Continuous Histogram
    ChartManager.renderGpaxHistogram('chart-overview-gpax', this.filteredStudents);
    ChartManager.renderToolsOverviewChart('chart-overview-tools', toolsCounts);
  },

  renderUsageTab() {
    const pSums = {};
    const pCounts = {};
    const sSums = {};
    const sCounts = {};

    this.filteredStudents.forEach(s => {
      Object.entries(s.purposes || {}).forEach(([k, v]) => {
        pSums[k] = (pSums[k] || 0) + v;
        pCounts[k] = (pCounts[k] || 0) + 1;
      });
      Object.entries(s.subjects || {}).forEach(([k, v]) => {
        if (v > 0) {
          sSums[k] = (sSums[k] || 0) + v;
          sCounts[k] = (sCounts[k] || 0) + 1;
        }
      });
    });

    const purposeLabelsMap = {
      explain: 'อธิบายเนื้อหาที่ไม่เข้าใจ',
      research: 'ค้นคว้าหาข้อมูลเพิ่มเติม',
      homework: 'ช่วยทำการบ้าน/แบบฝึกหัด',
      summary: 'สรุปบทเรียน/ย่อเนื้อหา',
      code: 'เขียน/แก้ไขโค้ด',
      translate: 'แปลภาษา/ตรวจไวยากรณ์',
      exam: 'เตรียมสอบ/สร้างข้อสอบฝึกหัด',
      report: 'เขียนรายงาน/เรียงความ',
      plan: 'วางแผนการอ่านหนังสือ/จัดตารางเรียน'
    };

    const purposeRankings = Object.keys(purposeLabelsMap).map(k => ({
      key: k,
      label: purposeLabelsMap[k],
      avg: pCounts[k] ? Math.round((pSums[k] / pCounts[k]) * 100) / 100 : 0
    })).sort((a, b) => b.avg - a.avg);

    const subjectLabelsMap = {
      major: 'วิชาเฉพาะสาขา',
      basic: 'วิชาพื้นฐาน (คณิตศาสตร์ ฟิสิกส์ เคมี)',
      language: 'วิชาภาษาต่างประเทศ',
      report: 'วิชาเขียนรายงาน/เรียงความ',
      programming: 'วิชาเขียนโปรแกรม'
    };

    const subjectRankings = Object.keys(subjectLabelsMap).map(k => ({
      key: k,
      label: subjectLabelsMap[k],
      avg: sCounts[k] ? Math.round((sSums[k] / sCounts[k]) * 100) / 100 : 0,
      count: sCounts[k] || 0
    })).sort((a, b) => b.avg - a.avg);

    ChartManager.renderPurposesRanking('chart-usage-purposes', purposeRankings);
    ChartManager.renderSubjectsChart('chart-usage-subjects', subjectRankings);
    this.renderUsageMatrixTable();
  },

  renderUsageMatrixTable() {
    const tableContainer = document.getElementById('usage-matrix-table-container');
    if (!tableContainer) return;

    const tiers = [
      { code: 't1', label: '3.25 - 4.00' },
      { code: 't2', label: '2.75 - 3.24' },
      { code: 't3', label: '2.50 - 2.74' },
      { code: 't4', label: '2.00 - 2.49' },
      { code: 't5', label: '< 2.00' }
    ];

    const purposes = [
      { key: 'explain', name: 'อธิบายเนื้อหาที่ไม่เข้าใจ' },
      { key: 'research', name: 'ค้นคว้าข้อมูลเพิ่มเติม' },
      { key: 'homework', name: 'ช่วยทำการบ้าน' },
      { key: 'summary', name: 'สรุปบทเรียน' },
      { key: 'code', name: 'เขียน/แก้โค้ด' },
      { key: 'translate', name: 'แปลภาษา/ตรวจแกรมม่า' },
      { key: 'exam', name: 'เตรียมสอบ' },
      { key: 'report', name: 'เขียนรายงาน' },
      { key: 'plan', name: 'วางแผนการอ่าน' }
    ];

    let html = '<table class="data-table"><thead><tr><th>วัตถุประสงค์การใช้ AI</th>';
    tiers.forEach(t => {
      html += '<th style="text-align:center;">GPAX ' + t.label + '</th>';
    });
    html += '<th style="text-align:center; background:#EFF6FF;">เฉลี่ยรวม (ทุกเกรด)</th></tr></thead><tbody>';

    purposes.forEach(p => {
      html += '<tr><td><strong>' + p.name + '</strong></td>';
      let totalSum = 0;
      let totalCount = 0;

      tiers.forEach(t => {
        const matches = this.filteredStudents.filter(s => s.gpaxBucket === t.code);
        const count = matches.length;
        const scoreSum = matches.reduce((acc, curr) => acc + (curr.purposes[p.key] || 0), 0);
        const avg = count > 0 ? (scoreSum / count).toFixed(2) : '-';

        if (avg !== '-') {
          totalSum += scoreSum;
          totalCount += count;
        }

        let bgColor = '#FFFFFF';
        let txtColor = '#1E293B';
        let opacity = '1.0';

        if (avg !== '-') {
          const num = parseFloat(avg);
          if (num >= 4.0) { bgColor = '#DCFCE7'; txtColor = '#15803D'; }
          else if (num >= 3.5) { bgColor = '#EFF6FF'; txtColor = '#1D4ED8'; }
          else if (num < 2.8) { bgColor = '#FEF2F2'; txtColor = '#B91C1C'; }
        }
        if (count < 5) {
          opacity = '0.55';
        }

        const cellContent = count > 0 
          ? avg + '<br><small style="font-size:0.75rem; color:#64748B; font-weight:normal;">(n=' + count + ')</small>'
          : '<span style="color:#94A3B8;">-</span>';

        html += '<td class="matrix-cell" style="background:' + bgColor + '; color:' + txtColor + '; opacity:' + opacity + ';">' + cellContent + '</td>';
      });

      const overallAvg = totalCount ? (totalSum / totalCount).toFixed(2) : '-';
      html += '<td class="matrix-cell" style="background:#EFF6FF; font-weight:700; color:#1E40AF;">' + overallAvg + '<br><small style="font-size:0.75rem; font-weight:normal; color:#64748B;">(n=' + totalCount + ')</small></td></tr>';
    });

    html += '</tbody></table>';
    tableContainer.innerHTML = html;
  },

  renderDependencyTab() {
    const behaviorData = {};
    let depSum = 0;
    let verifySum = 0;

    this.filteredStudents.forEach(s => {
      behaviorData[s.behavior] = (behaviorData[s.behavior] || 0) + 1;
      depSum += s.dependency;
      verifySum += s.verification;
    });

    const n = this.filteredStudents.length || 1;
    const avgDep = (depSum / n).toFixed(2);
    const avgVerify = (verifySum / n).toFixed(2);

    const verifyValEl = document.getElementById('gauge-verify-val');
    const depValEl = document.getElementById('gauge-dep-val');
    if (verifyValEl) verifyValEl.textContent = avgVerify;
    if (depValEl) depValEl.textContent = avgDep;

    this.updateGaugeCircle('gauge-verify-svg', avgVerify, 5.0, '#059669');
    this.updateGaugeCircle('gauge-dep-svg', avgDep, 5.0, '#2563EB');

    ChartManager.renderBehaviorChart('chart-dep-behavior', behaviorData);
    ChartManager.renderDependencyScatter('chart-dep-scatter', this.filteredStudents);
    ChartManager.renderEfaRadar('chart-dep-radar', this.data.researchStats.efa_factors);
  },

  updateGaugeCircle(svgId, val, max, color) {
    const circle = document.getElementById(svgId);
    if (!circle) return;
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.min(Math.max(val / max, 0), 1);
    const offset = circumference - (pct * circumference);
    circle.style.strokeDasharray = circumference + '';
    circle.style.strokeDashoffset = offset + '';
    circle.style.stroke = color;
  },

  renderPerformanceTab() {
    ChartManager.renderAnovaGpaxChart('chart-perf-anova', this.data.researchStats.anova_dependency_gpax);
  },

  renderSegmentsTab() {
    const mw9 = this.data.researchStats.digital_comparison.mann_whitney_9_items;
    ChartManager.renderDigitalComparisonChart('chart-segments-comparison', mw9);
    this.renderSegmentsTable(mw9);
  },

  renderSegmentsTable(items) {
    const container = document.getElementById('segments-table-container');
    if (!container) return;

    let html = '<table class="data-table"><thead><tr>' +
      '<th>รายการพฤติกรรม (ครบ 9 ข้อ)</th>' +
      '<th style="text-align:center;">เทคโนฯ Median (Mean)</th>' +
      '<th style="text-align:center;">นิเทศฯ Median (Mean)</th>' +
      '<th style="text-align:center;">U-Stat</th>' +
      '<th style="text-align:center;">p-value</th>' +
      '<th style="text-align:center;">Holm Adj.</th>' +
      '<th>สถานะนัยสำคัญ</th></tr></thead><tbody>';

    items.forEach(item => {
      const isSig = item.sig;
      const rowClass = isSig ? 'class="highlight-row"' : '';
      const tag = isSig 
        ? '<span class="tag-sig">' + (item.p_value === '< 0.001' ? 'มีนัยสำคัญสูงมาก*' : 'มีนัยสำคัญ') + '</span>' 
        : '<span class="tag-insig">ไม่ต่างกัน</span>';

      html += '<tr ' + rowClass + '>' +
        '<td><strong>' + item.label + '</strong></td>' +
        '<td style="text-align:center;"><strong>' + item.tech_median + '</strong> (' + item.tech_mean + ')</td>' +
        '<td style="text-align:center;"><strong>' + item.arts_median + '</strong> (' + item.arts_mean + ')</td>' +
        '<td style="text-align:center;">' + item.u_stat + '</td>' +
        '<td style="text-align:center; font-weight:' + (isSig ? 'bold' : 'normal') + '; color:' + (isSig ? '#B91C1C' : '#334155') + ';">' + item.p_value + '</td>' +
        '<td style="text-align:center;">' + item.holm_p + '</td>' +
        '<td>' + tag + '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  },

  // -------------------------------------------------------------
  // CONTRIBUTE / QUESTIONNAIRE MODULE
  // -------------------------------------------------------------
  initContributeForm() {
    const form = document.getElementById('contribute-form');
    if (!form) return;

    // Real-time Student ID check on input/change
    const sidInput = document.getElementById('q-student-id');
    const sidFeedback = document.getElementById('sid-validation-msg');
    if (sidInput && sidFeedback) {
      sidInput.addEventListener('input', () => {
        const val = sidInput.value.trim().toUpperCase();
        sidInput.value = val;
        this.validateStudentIdPreview(val, sidFeedback);
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleContributeSubmit();
    });

    // Admin Passcode & Export Modal bindings
    const openAdminBtn = document.getElementById('btn-open-admin-export');
    const closeAdminBtn = document.getElementById('btn-close-admin-modal');
    const cancelAdminBtn = document.getElementById('btn-cancel-admin-modal');
    const submitAdminBtn = document.getElementById('btn-submit-admin-modal');
    const clearAdminBtn = document.getElementById('btn-admin-clear-data');
    const togglePasscodeBtn = document.getElementById('btn-toggle-passcode');
    const passcodeInput = document.getElementById('admin-passcode-input');
    const modal = document.getElementById('admin-auth-modal');

    if (openAdminBtn) {
      openAdminBtn.addEventListener('click', () => this.openAdminModal());
    }
    if (closeAdminBtn) {
      closeAdminBtn.addEventListener('click', () => this.closeAdminModal());
    }
    if (cancelAdminBtn) {
      cancelAdminBtn.addEventListener('click', () => this.closeAdminModal());
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeAdminModal();
      });
    }
    if (togglePasscodeBtn && passcodeInput) {
      togglePasscodeBtn.addEventListener('click', () => {
        passcodeInput.type = passcodeInput.type === 'password' ? 'text' : 'password';
      });
    }
    if (passcodeInput) {
      passcodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleAdminExport();
        }
      });
    }
    if (submitAdminBtn) {
      submitAdminBtn.addEventListener('click', () => this.handleAdminExport());
    }
    if (clearAdminBtn) {
      clearAdminBtn.addEventListener('click', () => this.handleAdminClearData());
    }

    this.updateContributeStats();
  },

  openAdminModal() {
    const modal = document.getElementById('admin-auth-modal');
    const passcodeInput = document.getElementById('admin-passcode-input');
    const errorEl = document.getElementById('admin-auth-error');
    if (!modal) return;
    if (passcodeInput) {
      passcodeInput.value = '';
      passcodeInput.type = 'password';
    }
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
    modal.style.display = 'flex';
    setTimeout(() => passcodeInput?.focus(), 80);
  },

  closeAdminModal() {
    const modal = document.getElementById('admin-auth-modal');
    if (modal) modal.style.display = 'none';
  },

  verifyAdminPasscode(passcode) {
    if (!passcode) return false;
    const clean = passcode.trim().toLowerCase();
    // Authorized passcodes for Group 45 creators
    return clean === 'group45' || clean === 'sut45' || clean === 'admin45';
  },

  handleAdminExport() {
    const passcodeInput = document.getElementById('admin-passcode-input');
    const errorEl = document.getElementById('admin-auth-error');
    const passcode = passcodeInput ? passcodeInput.value : '';

    if (!this.verifyAdminPasscode(passcode)) {
      if (errorEl) {
        errorEl.textContent = '❌ รหัสผ่านไม่ถูกต้อง เฉพาะคณะผู้จัดทำโครงงาน (กลุ่ม 45) เท่านั้นที่มีสิทธิ์ดาวน์โหลด';
        errorEl.style.display = 'block';
      }
      passcodeInput?.focus();
      return;
    }

    const list = this.getContributeResponses();
    if (list.length === 0) {
      if (errorEl) {
        errorEl.textContent = '⚠️ ยังไม่มีข้อมูลการตอบแบบสอบถามเพิ่มเติมในระบบสำหรับดาวน์โหลด';
        errorEl.style.display = 'block';
      }
      return;
    }

    this.closeAdminModal();
    this.exportContributeCsv();
  },

  handleAdminClearData() {
    const passcodeInput = document.getElementById('admin-passcode-input');
    const errorEl = document.getElementById('admin-auth-error');
    const passcode = passcodeInput ? passcodeInput.value : '';

    if (!this.verifyAdminPasscode(passcode)) {
      if (errorEl) {
        errorEl.textContent = '❌ รหัสผ่านไม่ถูกต้อง ต้องใช้รหัสผ่านผู้จัดทำเพื่อล้างข้อมูล';
        errorEl.style.display = 'block';
      }
      passcodeInput?.focus();
      return;
    }

    if (confirm('คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลคำตอบที่บันทึกไว้ในเบราว์เซอร์เครื่องนี้ทั้งหมด? ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้')) {
      localStorage.removeItem('CONTRIBUTE_RESPONSES');
      this.updateContributeStats();
      this.closeAdminModal();
      alert('ล้างข้อมูลคำตอบเพิ่มเติมในเครื่องเรียบร้อยแล้ว');
    }
  },

  getContributeResponses() {
    try {
      const raw = localStorage.getItem('CONTRIBUTE_RESPONSES');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error reading contribute responses', e);
      return [];
    }
  },

  saveContributeResponse(item) {
    const list = this.getContributeResponses();
    list.push(item);
    localStorage.setItem('CONTRIBUTE_RESPONSES', JSON.stringify(list));
    this.updateContributeStats();
  },

  validateStudentIdPreview(sid, feedbackEl) {
    if (!sid) {
      feedbackEl.textContent = '';
      feedbackEl.className = 'form-feedback';
      return;
    }
    const isBaseline = (window.BASELINE_STUDENT_IDS || []).includes(sid);
    const existingNew = this.getContributeResponses().some(r => (r.studentId || '').toUpperCase() === sid);

    if (isBaseline) {
      feedbackEl.textContent = '❌ รหัสนักศึกษานี้มีอยู่ในฐานข้อมูลแบบสอบถามเดิม (314 คน) แล้ว ไม่สามารถตอบซ้ำได้';
      feedbackEl.className = 'form-feedback error';
    } else if (existingNew) {
      feedbackEl.textContent = '❌ รหัสนักศึกษานี้เคยส่งแบบสอบถามเพิ่มเติมผ่านหน้านี้ไปแล้ว';
      feedbackEl.className = 'form-feedback error';
    } else if (!/^[BMD]\d{7}$/i.test(sid)) {
      feedbackEl.textContent = '⚠️ รูปแบบรหัสนักศึกษาควรขึ้นต้นด้วย B, M หรือ D ตามด้วยตัวเลข 7 หลัก (เช่น B6612345)';
      feedbackEl.className = 'form-feedback warning';
    } else {
      feedbackEl.textContent = '✅ รหัสนักศึกษานี้สามารถทำแบบสอบถามได้';
      feedbackEl.className = 'form-feedback success';
    }
  },

  handleContributeSubmit() {
    const sidInput = document.getElementById('q-student-id');
    const sid = (sidInput?.value || '').trim().toUpperCase();

    if (!sid) {
      alert('กรุณากรอกรหัสนักศึกษา');
      sidInput?.focus();
      return;
    }

    // Duplicate check 1: Baseline 314
    if ((window.BASELINE_STUDENT_IDS || []).includes(sid)) {
      alert('ขออภัย: รหัสนักศึกษา ' + sid + ' มีอยู่ในฐานข้อมูลแบบสอบถามเดิมแล้ว ไม่สามารถกรอกซ้ำได้');
      sidInput?.focus();
      return;
    }

    // Duplicate check 2: New local submissions
    const existing = this.getContributeResponses();
    if (existing.some(r => (r.studentId || '').toUpperCase() === sid)) {
      alert('ขออภัย: รหัสนักศึกษา ' + sid + ' ได้เคยตอบแบบสอบถามเพิ่มเติมไปแล้ว');
      sidInput?.focus();
      return;
    }

    // Collect all fields
    const getRadio = (name) => document.querySelector('input[name="' + name + '"]:checked')?.value || '';
    const getCheckboxes = (name) => Array.from(document.querySelectorAll('input[name="' + name + '"]:checked')).map(el => el.value);
    const getText = (id) => document.getElementById(id)?.value?.trim() || '';

    const newRecord = {
      timestamp: new Date().toLocaleString('th-TH'),
      gender: getRadio('q_gender'),
      year: getRadio('q_year'),
      studentId: sid,
      faculty: document.getElementById('q-faculty')?.value || '',
      major: getText('q-major'),
      gpaxTier: getRadio('q_gpax_tier'),
      realGpax: getText('q-real-gpax'),
      attendanceRate: getRadio('q_attendance'),
      lateFreq: getRadio('q_late_freq'),
      studyHours: getRadio('q_study_hours'),
      activityHours: getRadio('q_activity_hours'),
      everUsedAI: getRadio('q_ever_used'),
      startUsingAI: getRadio('q_start_using'),
      isPaidAI: getRadio('q_is_paid'),
      tools: getCheckboxes('q_tools'),
      frequency: getRadio('q_freq'),
      timeSpent: getRadio('q_time_spent'),
      // Purposes (1-5)
      purpose_summary: getRadio('p_summary'),
      purpose_research: getRadio('p_research'),
      purpose_explain: getRadio('p_explain'),
      purpose_homework: getRadio('p_homework'),
      purpose_code: getRadio('p_code'),
      purpose_translate: getRadio('p_translate'),
      purpose_exam: getRadio('p_exam'),
      purpose_report: getRadio('p_report'),
      purpose_plan: getRadio('p_plan'),
      // Behavior & verification
      behavior: getRadio('q_behavior'),
      verification: getRadio('q_verification'),
      // Subjects (1-5)
      subj_basic: getRadio('s_basic'),
      subj_prog: getRadio('s_prog'),
      subj_report: getRadio('s_report'),
      subj_lang: getRadio('s_lang'),
      subj_major: getRadio('s_major'),
      // Dependency & Attitudes
      dependency: getRadio('q_dependency'),
      missClassAction: getRadio('q_miss_class'),
      criticalThinkingLess: getRadio('q_critical_less'),
      longtermWorry: getRadio('q_longterm_worry'),
      decisionHarder: getRadio('q_decision_harder'),
      skipClassTendency: getRadio('q_skip_class'),
      reasonsNotUse: getCheckboxes('q_reasons_not_use')
    };

    this.saveContributeResponse(newRecord);

    const alertBox = document.getElementById('contribute-success-msg');
    if (alertBox) {
      alertBox.style.display = 'block';
      alertBox.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert('บันทึกข้อมูลแบบสอบถามสำเร็จ! ข้อมูลถูกเก็บไว้ในไฟล์ชีตชุดใหม่เรียบร้อยแล้ว');
    }

    document.getElementById('contribute-form')?.reset();
    const sidFeedback = document.getElementById('sid-validation-msg');
    if (sidFeedback) {
      sidFeedback.textContent = '';
      sidFeedback.className = 'form-feedback';
    }
  },

  updateContributeStats() {
    const list = this.getContributeResponses();
    const counterEl = document.getElementById('contribute-counter-number');
    const statusEl = document.getElementById('contribute-counter-status');

    if (counterEl) {
      counterEl.textContent = list.length;
    }

    if (statusEl) {
      if (list.length === 0) {
        statusEl.textContent = 'ยังไม่มีข้อมูลเพิ่มเติม (พร้อมรับคำตอบใหม่)';
        statusEl.style.color = 'var(--text-muted)';
      } else {
        statusEl.textContent = 'บันทึกแล้ว ' + list.length + ' ชุดคำตอบ (ข้อมูลถูกเก็บเป็นความลับเพื่อการวิจัย)';
        statusEl.style.color = 'var(--accent-blue)';
      }
    }
  },

  exportContributeCsv() {
    const list = this.getContributeResponses();
    if (list.length === 0) {
      alert('ยังไม่มีข้อมูลการตอบแบบสอบถามเพิ่มเติมสำหรับส่งออก');
      return;
    }

    const headers = [
      'ประทับเวลา',
      'เพศ',
      'ชั้นปี',
      'รหัสนักศึกษา',
      'สำนักวิชา',
      'สาขาวิชา',
      'ช่วง GPAX',
      'Real-GPAX',
      'อัตราการเข้าเรียน',
      'ความถี่เข้าสาย',
      'ชม.อ่านหนังสือต่อสัปดาห์',
      'ชม.กิจกรรม/งานพิเศษ',
      'เคยใช้ AI หรือไม่',
      'เริ่มใช้เมื่อใด',
      'ใช้แบบเสียเงินหรือไม่',
      'เครื่องมือ AI ที่ใช้',
      'ความถี่ในการใช้',
      'ระยะเวลาต่อครั้ง',
      'วัตถุประสงค์[สรุปบทเรียน]',
      'วัตถุประสงค์[ค้นคว้า]',
      'วัตถุประสงค์[อธิบาย]',
      'วัตถุประสงค์[การบ้าน]',
      'วัตถุประสงค์[เขียนโค้ด]',
      'วัตถุประสงค์[แปลภาษา]',
      'วัตถุประสงค์[เตรียมสอบ]',
      'วัตถุประสงค์[เขียนรายงาน]',
      'วัตถุประสงค์[วางแผนอ่าน]',
      'พฤติกรรมการใช้งาน AI',
      'การตรวจสอบคำตอบ',
      'วิชาพื้นฐาน (วิทย์/คณิต)',
      'วิชาเขียนโปรแกรม',
      'วิชาเขียนรายงาน',
      'วิชาภาษาต่างประเทศ',
      'วิชาเฉพาะสาขา',
      'ระดับการพึ่งพา AI',
      'เมื่อไม่ได้เข้าเรียน',
      'คิดวิเคราะห์น้อยลง',
      'กังวลทักษะระยะยาว',
      'แก้ปัญหาเองยากขึ้น',
      'เข้าเรียนจำเป็นน้อยลง',
      'เหตุผลที่ไม่ใช้ AI'
    ];

    let csvContent = '\uFEFF'; // UTF-8 BOM for Thai language in Excel
    csvContent += headers.map(h => '"' + h.replace(/"/g, '""') + '"').join(',') + '\r\n';

    list.forEach(r => {
      const row = [
        r.timestamp || '',
        r.gender || '',
        r.year || '',
        r.studentId || '',
        r.faculty || '',
        r.major || '',
        r.gpaxTier || '',
        r.realGpax || '',
        r.attendanceRate || '',
        r.lateFreq || '',
        r.studyHours || '',
        r.activityHours || '',
        r.everUsedAI || '',
        r.startUsingAI || '',
        r.isPaidAI || '',
        (r.tools || []).join('; '),
        r.frequency || '',
        r.timeSpent || '',
        r.purpose_summary || '',
        r.purpose_research || '',
        r.purpose_explain || '',
        r.purpose_homework || '',
        r.purpose_code || '',
        r.purpose_translate || '',
        r.purpose_exam || '',
        r.purpose_report || '',
        r.purpose_plan || '',
        r.behavior || '',
        r.verification || '',
        r.subj_basic || '',
        r.subj_prog || '',
        r.subj_report || '',
        r.subj_lang || '',
        r.subj_major || '',
        r.dependency || '',
        r.missClassAction || '',
        r.criticalThinkingLess || '',
        r.longtermWorry || '',
        r.decisionHarder || '',
        r.skipClassTendency || '',
        (r.reasonsNotUse || []).join('; ')
      ];
      csvContent += row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const nowStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', 'แบบสอบถามเพิ่มเติม_Group45_' + nowStr + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
