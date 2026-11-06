// charts.js - Interactive Visualization Controller for Group 45 SUT AI Research
// JASP / Excel Aligned Visualizations

const ChartManager = {
  instances: {},

  colors: {
    navy: '#1B2A4A',
    navyLight: '#2D4373',
    blue: '#2563EB',
    blueLight: '#60A5FA',
    orange: '#EA580C',
    orangeLight: '#FDBA74',
    red: '#E11D48',
    redLight: '#FDA4AF',
    green: '#059669',
    greenLight: '#6EE7B7',
    slate: '#64748B',
    slateLight: '#CBD5E1',
    palette: ['#1B2A4A', '#2563EB', '#EA580C', '#059669', '#7C3AED', '#DB2777', '#0891B2', '#D97706', '#4B5563']
  },

  destroyChart(id) {
    if (this.instances[id]) {
      try {
        this.instances[id].destroy();
      } catch (e) {
        console.warn('Error destroying chart ' + id, e);
      }
      delete this.instances[id];
    }
  },

  // Overview Tab Charts
  renderFacultyChart(canvasId, facultyData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = Object.keys(facultyData);
    const counts = Object.values(facultyData);
    const total = counts.reduce((a, b) => a + b, 0) || 1;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'จำนวนนักศึกษา (คน)',
          data: counts,
          backgroundColor: '#1B2A4A',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(item) {
                const pct = ((item.raw / total) * 100).toFixed(1);
                return ' ' + item.raw + ' คน (' + pct + '%)';
              }
            }
          }
        },
        scales: {
          x: { grid: { color: '#F1F5F9' }, ticks: { font: { family: 'Prompt' } } },
          y: { grid: { display: false }, ticks: { font: { family: 'Prompt', size: 12 } } }
        }
      }
    });
  },

  renderYearChart(canvasId, yearData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = ['ปี 1', 'ปี 2', 'ปี 3', 'ปี 4', 'ปี 5 ขึ้นไป'];
    const counts = labels.map(l => yearData[l] || 0);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'จำนวนนักศึกษา',
          data: counts,
          backgroundColor: '#2563EB',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  // Real-GPAX Continuous Histogram (No binning, exact continuous GPAX frequencies, Y-axis: จำนวนคน)
  renderGpaxHistogram(canvasId, students) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const gpaxCounts = {};
    (students || []).forEach(s => {
      if (s.gpax !== null && s.gpax !== undefined) {
        const val = Number(s.gpax).toFixed(2);
        gpaxCounts[val] = (gpaxCounts[val] || 0) + 1;
      }
    });

    const sortedLabels = Object.keys(gpaxCounts).sort((a, b) => parseFloat(a) - parseFloat(b));
    const counts = sortedLabels.map(g => gpaxCounts[g]);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sortedLabels,
        datasets: [{
          label: 'จำนวนนักศึกษา (คน)',
          data: counts,
          backgroundColor: '#2563EB',
          borderColor: '#1D4ED8',
          borderWidth: 1,
          barPercentage: 1.0,
          categoryPercentage: 0.95,
          borderRadius: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function(items) {
                return 'Real-GPAX: ' + items[0].label;
              },
              label: function(item) {
                return ' จำนวน: ' + item.raw + ' คน';
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'เกรดเฉลี่ยสะสม (Real-GPAX ต่อเนื่อง)',
              font: { family: 'Prompt', size: 12, weight: 600 }
            },
            grid: { display: false },
            ticks: {
              maxTicksLimit: 20,
              font: { family: 'Prompt', size: 10 }
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'จำนวนคน (คน)',
              font: { family: 'Prompt', size: 12, weight: 600 }
            },
            ticks: {
              stepSize: 1,
              font: { family: 'Prompt' }
            },
            grid: { color: '#F1F5F9' }
          }
        }
      }
    });
  },

  // Shows Selection Share % (aligned with slide 37.3%) and User reach % in tooltip
  renderToolsOverviewChart(canvasId, toolsData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const sortedTools = Object.entries(toolsData).sort((a, b) => b[1] - a[1]);
    const labels = sortedTools.map(t => t[0]);
    const counts = sortedTools.map(t => t[1]);
    const totalSelections = counts.reduce((a, b) => a + b, 0) || 1;
    const totalRespondents = 314;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'สัดส่วนจำนวนครั้งที่เลือก (%)',
          data: counts.map(c => Math.round((c / totalSelections) * 1000) / 10),
          backgroundColor: labels.map((l, i) => i === 0 || i === 1 ? '#1B2A4A' : (i === 2 ? '#2563EB' : '#94A3B8')),
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(item) {
                const count = counts[item.dataIndex];
                const sharePct = item.raw;
                const userPct = ((count / totalRespondents) * 100).toFixed(1);
                return [
                  ' สัดส่วนครั้งที่เลือก: ' + sharePct + '% (' + count + ' ครั้ง)',
                  ' คิดเป็นผู้ใช้งาน: ' + userPct + '% ของนักศึกษา (' + count + '/314 คน)'
                ];
              }
            }
          }
        },
        scales: {
          y: { 
            beginAtZero: true, 
            max: 50, 
            ticks: { callback: v => v + '%' },
            title: { display: true, text: 'สัดส่วนจากจำนวนครั้งที่ถูกเลือกทั้งหมด (Selection Share %)' }
          },
          x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Prompt' } } }
        }
      }
    });
  },

  // Usage Tab (PP1)
  renderPurposesRanking(canvasId, rankings) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = rankings.map(r => r.label);
    const avgs = rankings.map(r => r.avg);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'คะแนนเฉลี่ยการใช้งาน (1-5)',
          data: avgs,
          backgroundColor: avgs.map(a => a >= 4.0 ? '#059669' : (a >= 3.3 ? '#2563EB' : '#EA580C')),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(item) {
                return ' คะแนนเฉลี่ย: ' + item.raw + ' / 5.00';
              }
            }
          }
        },
        scales: {
          x: { min: 0, max: 5, grid: { color: '#F1F5F9' } },
          y: { grid: { display: false }, ticks: { font: { family: 'Prompt', size: 12 } } }
        }
      }
    });
  },

  // PP1: AI Usage in Various Subjects (Horizontal Bar Chart)
  renderSubjectsChart(canvasId, rankings) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = rankings.map(r => r.label);
    const avgs = rankings.map(r => r.avg);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'คะแนนเฉลี่ยการใช้งาน (1-5)',
          data: avgs,
          backgroundColor: avgs.map(a => a >= 3.5 ? '#EA580C' : (a >= 3.0 ? '#F97316' : '#FB923C')),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(item) {
                const count = rankings[item.dataIndex]?.count;
                return ' คะแนนเฉลี่ย: ' + item.raw + ' / 5.00' + (count ? ' (n=' + count + ' คน)' : '');
              }
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: 5,
            grid: { color: '#F1F5F9' },
            title: {
              display: true,
              text: 'คะแนนเฉลี่ยระดับการใช้งาน (1 = น้อยที่สุด, 5 = มากที่สุด)',
              font: { family: 'Prompt', size: 11 }
            }
          },
          y: {
            grid: { display: false },
            ticks: { font: { family: 'Prompt', size: 11 } }
          }
        }
      }
    });
  },

  // Dependency Tab (PP2)
  renderBehaviorChart(canvasId, behaviorData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = [
      'ขอคำอธิบาย/ทำความเข้าใจ (66.0%)',
      'ตรวจทานคำตอบของตนเอง (19.3%)',
      'สร้างคำตอบแทบไม่แก้ (กลุ่มเสี่ยง 8.1%)',
      'พูดคุยพัฒนาความคิด (6.6%)'
    ];
    
    let c1 = 0, c2 = 0, c3 = 0, c4 = 0;
    Object.entries(behaviorData).forEach(([k, v]) => {
      if (k.includes('อธิบาย') || k.includes('เข้าใจ')) c1 += v;
      else if (k.includes('ตรวจทาน')) c2 += v;
      else if (k.includes('ไม่ปรับแก้') || k.includes('แทบไม่แก้')) c3 += v;
      else if (k.includes('พูดคุย') || k.includes('พัฒนาความคิด')) c4 += v;
    });

    const total = (c1 + c2 + c3 + c4) || 1;
    const pcts = [
      Math.round((c1/total)*1000)/10,
      Math.round((c2/total)*1000)/10,
      Math.round((c3/total)*1000)/10,
      Math.round((c4/total)*1000)/10
    ];

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'สัดส่วน (%)',
          data: pcts,
          backgroundColor: ['#2563EB', '#059669', '#E11D48', '#EA580C'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(item) {
                const arr = [c1, c2, c3, c4];
                return ' ' + item.raw + '% (' + arr[item.dataIndex] + ' คน)';
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } },
          x: { ticks: { font: { family: 'Prompt', size: 11 } } }
        }
      }
    });
  },

  renderDependencyScatter(canvasId, students) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const normalPoints = [];
    const riskPoints = [];

    students.forEach(s => {
      const p = { x: s.dependency, y: s.verification, gpax: s.gpax, faculty: s.faculty };
      if (s.dependency >= 4 && s.verification <= 3) {
        riskPoints.push(p);
      } else {
        normalPoints.push(p);
      }
    });

    this.instances[canvasId] = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'กลุ่มปกติ/ระมัดระวัง',
            data: normalPoints,
            backgroundColor: 'rgba(37, 99, 235, 0.45)',
            borderColor: '#2563EB',
            pointRadius: 6,
            pointHoverRadius: 8
          },
          {
            label: 'กลุ่มเสี่ยง (พึ่งพาสูง + ตรวจสอบต่ำ)',
            data: riskPoints,
            backgroundColor: 'rgba(225, 29, 72, 0.75)',
            borderColor: '#E11D48',
            pointRadius: 8,
            pointHoverRadius: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Prompt' } } },
          tooltip: {
            callbacks: {
              label: function(item) {
                return ' พึ่งพา: ' + item.raw.x + ', ตรวจสอบ: ' + item.raw.y + ' (GPAX: ' + (item.raw.gpax || 'N/A') + ')';
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'ระดับการพึ่งพา AI (1: น้อยมาก → 5: มากที่สุด)', font: { family: 'Prompt', weight: 600 } },
            min: 0.5,
            max: 5.5,
            ticks: { stepSize: 1 }
          },
          y: {
            title: { display: true, text: 'ระดับการตรวจสอบคำตอบ (1: ไม่ตรวจ → 5: ตรวจทุกครั้ง)', font: { family: 'Prompt', weight: 600 } },
            min: 0.5,
            max: 5.5,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  },

  renderEfaRadar(canvasId, efaFactors) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = [
      'F1: มโนทัศน์/อธิบาย (Conceptual: 4.13)',
      'F2: เทคนิค/โค้ด (Procedural: 3.45)',
      'F3: ภาษา/เขียน (Language: 3.28)',
      'F4: ติว/ข้อสอบ (Exam Prep: 3.12)',
      'F5: วางแผนเรียน (Planning: 2.60)'
    ];
    const scores = efaFactors.map(f => f.score);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'คะแนนการใช้งานเฉลี่ย (1-5)',
          data: scores,
          backgroundColor: 'rgba(234, 88, 12, 0.25)',
          borderColor: '#EA580C',
          pointBackgroundColor: '#1B2A4A',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#1B2A4A',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(item) {
                return ' คะแนนเฉลี่ย: ' + item.raw + ' / 5.00';
              }
            }
          }
        },
        scales: {
          r: {
            min: 1,
            max: 5,
            ticks: { stepSize: 1, backdropColor: 'transparent' },
            pointLabels: { font: { family: 'Prompt', size: 11, weight: 600 } }
          }
        }
      }
    });
  },

  // EXACT JASP ANOVA: Non-linear Inverted-U Shape (1: 2.56, 2: 2.79, 3: 2.84, 4: 2.94, 5: 2.72)
  renderAnovaGpaxChart(canvasId, anovaData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = anovaData.map(a => 'ระดับ ' + a.level + ' (n=' + a.n + ')');
    const means = anovaData.map(a => a.mean_gpax);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'GPAX เฉลี่ยจริง',
          data: means,
          backgroundColor: ['#94A3B8', '#60A5FA', '#2563EB', '#1D4ED8', '#EA580C'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(item) {
                const itemData = anovaData[item.dataIndex];
                return ' GPAX เฉลี่ย: ' + item.raw + ' ± ' + itemData.std + ' (n = ' + itemData.n + ' คน)';
              }
            }
          }
        },
        scales: {
          y: { 
            min: 2.4, 
            max: 3.1, 
            title: { display: true, text: 'GPAX เฉลี่ยจริง (JASP Verified)' },
            ticks: { stepSize: 0.1 }
          },
          x: { 
            title: { display: true, text: 'ระดับการพึ่งพา AI (1 = น้อยมาก → 5 = มากที่สุด)' } 
          }
        }
      }
    });
  },

  // Segments Tab: Compare 9 items via MEDIANS (Digital Tech n=45 vs Digital Arts n=24)
  renderDigitalComparisonChart(canvasId, mw9Items) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = mw9Items.map(item => item.sig ? (item.label + ' (*)') : item.label);
    const techMedians = mw9Items.map(item => item.tech_median);
    const artsMedians = mw9Items.map(item => item.arts_median);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'เทคโนโลยีดิจิทัล (สายเทคนิค, n=45)',
            data: techMedians,
            backgroundColor: '#1B2A4A',
            borderRadius: 6
          },
          {
            label: 'นิเทศศาสตร์ดิจิทัล (สายสร้างสรรค์, n=24)',
            data: artsMedians,
            backgroundColor: '#EA580C',
            borderRadius: 6
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Prompt' } } },
          tooltip: {
            callbacks: {
              label: function(item) {
                const row = mw9Items[item.dataIndex];
                const meanVal = item.datasetIndex === 0 ? row.tech_mean : row.arts_mean;
                return ' ' + item.dataset.label + ': Median = ' + item.raw + ' (Mean = ' + meanVal + ')';
              },
              afterBody: function(items) {
                const row = mw9Items[items[0].dataIndex];
                return [
                  'สถิติ: U = ' + row.u_stat + ', p = ' + row.p_value + ', Holm = ' + row.holm_p,
                  'ผล: ' + row.note
                ];
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'ค่ามัธยฐาน (Median คะแนน Likert 1-5)' },
            min: 0,
            max: 5,
            ticks: { stepSize: 1 }
          },
          y: {
            ticks: { font: { family: 'Prompt', size: 11 } }
          }
        }
      }
    });
  }
};
