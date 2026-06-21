/**
 * Plan Executor - 强制按待办清单执行
 *
 * 用法：
 *   const { PlanExecutor } = require('./scripts/plan-executor');
 *   const executor = new PlanExecutor(workdirRoot, skillProjectId);
 *
 *   // 定义待办清单
 *   executor.definePlan([
 *     { id: 'init', name: '初始化', fn: () => { ... } },
 *     { id: 'design', name: '生成 design.md', fn: () => { ... } },
 *     { id: 'confirm', name: '确认 design.md', fn: () => { ... } },
 *     { id: 'json', name: '生成 project.json', fn: () => { ... } },
 *     { id: 'validate', name: '校验', fn: () => { ... } },
 *     { id: 'upload', name: '打包上传', fn: () => { ... } }
 *   ]);
 *
 *   // 执行下一步（自动按顺序执行）
 *   await executor.executeNext();
 *
 *   // 获取当前进度
 *   const progress = executor.getProgress();
 *   // { currentStep: 2, totalSteps: 6, currentName: '生成 design.md', completed: ['init'] }
 */

const fs = require('fs');
const path = require('path');

class PlanExecutor {
  constructor(workdirRoot, skillProjectId) {
    this.workdirRoot = workdirRoot;
    this.skillProjectId = skillProjectId;
    this.planPath = path.join(workdirRoot, skillProjectId, '.canvasvideo', 'plan-state.json');
    this.plan = [];
    this.state = this.loadState();
  }

  /**
   * 加载执行状态
   */
  loadState() {
    if (fs.existsSync(this.planPath)) {
      return JSON.parse(fs.readFileSync(this.planPath, 'utf-8'));
    }
    return {
      currentStep: 0,  // 当前执行到第几步（从0开始）
      completed: [],   // 已完成的步骤 ID 列表
      startedAt: new Date().toISOString()
    };
  }

  /**
   * 保存执行状态
   */
  saveState() {
    fs.mkdirSync(path.dirname(this.planPath), { recursive: true });
    fs.writeFileSync(this.planPath, JSON.stringify(this.state, null, 2));
  }

  /**
   * 定义待办清单
   * @param {Array<{id: string, name: string, fn: Function}>} plan
   */
  definePlan(plan) {
    this.plan = plan;
    this.saveState();
  }

  /**
   * 获取当前进度
   */
  getProgress() {
    return {
      currentStep: this.state.currentStep,
      totalSteps: this.plan.length,
      currentName: this.plan[this.state.currentStep]?.name || '全部完成',
      completed: this.state.completed,
      isComplete: this.state.currentStep >= this.plan.length
    };
  }

  /**
   * 检查是否可以执行某一步
   * @param {number} stepIndex
   */
  canExecute(stepIndex) {
    // 只能按顺序执行，不能跳步
    if (stepIndex !== this.state.currentStep) {
      return {
        ok: false,
        error: `不能跳步！当前应该执行第 ${this.state.currentStep + 1} 步（${this.plan[this.state.currentStep]?.name}），但你尝试执行第 ${stepIndex + 1} 步`
      };
    }
    return { ok: true };
  }

  /**
   * 执行下一步
   * @returns {Promise<{success: boolean, step: string, error?: string}>}
   */
  async executeNext() {
    const stepIndex = this.state.currentStep;

    if (stepIndex >= this.plan.length) {
      return { success: true, step: 'all', message: '所有步骤已完成' };
    }

    const step = this.plan[stepIndex];

    // 检查是否可以执行
    const check = this.canExecute(stepIndex);
    if (!check.ok) {
      return { success: false, step: step.id, error: check.error };
    }

    try {
      // 执行步骤函数
      await step.fn();

      // 标记完成
      this.state.completed.push(step.id);
      this.state.currentStep++;
      this.saveState();

      return {
        success: true,
        step: step.id,
        name: step.name,
        progress: this.getProgress()
      };
    } catch (err) {
      return {
        success: false,
        step: step.id,
        name: step.name,
        error: err.message
      };
    }
  }

  /**
   * 获取待办清单文本（用于输出给用户）
   */
  getPlanText() {
    const lines = ['📋 视频生成待办清单'];
    lines.push('');

    this.plan.forEach((step, index) => {
      const isCompleted = this.state.completed.includes(step.id);
      const isCurrent = index === this.state.currentStep;
      const isPending = index > this.state.currentStep;

      if (isCompleted) {
        lines.push(`✅ ${index + 1}. ${step.name}`);
      } else if (isCurrent) {
        lines.push(`⏳ ${index + 1}. ${step.name} ← 当前步骤`);
      } else {
        lines.push(`⬜ ${index + 1}. ${step.name}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * 重置到某一步（用于错误恢复）
   * @param {number} stepIndex
   */
  resetTo(stepIndex) {
    this.state.currentStep = stepIndex;
    this.state.completed = this.plan.slice(0, stepIndex).map(s => s.id);
    this.saveState();
  }
}

module.exports = { PlanExecutor };
