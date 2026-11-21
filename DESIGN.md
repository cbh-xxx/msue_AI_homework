---
name: Muse AI 再创作演示
description: 延续用户截图的桌面 App 界面预览
colors:
  app-bg: "#101014"
  surface: "#1b1d27"
  text: "#f5f5f7"
  muted: "#a4a5af"
  dialog: "#e9f7ff"
  dialog-ink: "#101014"
  detail-top: "#ccbeb0"
  detail-middle: "#a89680"
  detail-bottom: "#7d6a50"
typography:
  body:
    fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif'
    fontSize: "14px"
    lineHeight: 1.6
  app-title:
    fontSize: "18px"
    fontWeight: 600
  suggestion:
    fontSize: "12px"
    lineHeight: 1.8
  time:
    fontSize: "11px"
rounded:
  panel: "14px"
  suggestion: "11px"
  button: "10px"
  dialog: "18px"
spacing:
  compact: "8px"
  standard: "12px"
  section: "23px"
components:
  suggestion:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.suggestion}"
    padding: "11px 12px 7px"
  editor:
    backgroundColor: "{colors.dialog}"
    textColor: "{colors.dialog-ink}"
    rounded: "{rounded.dialog}"
    padding: "27px 21px 22px"
---

# Muse AI 演示设计记录

## Overview

当前是第二阶段静态界面，继承用户提供的 Muse AI 截图，不重新定义品牌。暖棕详情页承载生日歌封面，其余功能页面为深色；浅蓝编辑弹窗保护文字编辑任务的焦点。外侧桌面导航与说明不属于 App 产品界面。

本记录从当前 HTML、CSS 和 JavaScript 提取，未启动浏览器、未量测截图颜色或进行视觉验收。真实音频、时间轴拖动、完整新增删除和文字保存尚未接入。

## Colors

深色背景和略亮面板形成层级；正文近白，次级内容使用 muted。详情背景由 detail-top、detail-middle、detail-bottom 组成纵向渐变。弹窗采用浅蓝背景、深色文字和黑白按钮。颜色值描述当前代码，不代表原 App 官方设计参数。

## Typography

中文采用系统可用的微软雅黑、苹方等字体，不依赖网络字体。App 标题 18px，详情页歌名 22px，建议正文 12px，时间 11px 并使用等宽数字。桌面外壳标题 25px；仅外壳的字母标志使用 Georgia。

## Layout

桌面页面最小宽度 1060px，默认三列为 230px / 418px / 218px，间隔 58px；宽度不超过 1190px 时缩小两侧列及间隔，不提供手机访问适配。

设备外框宽 410px，内边距 9px，高度为 min(850px, 100vh − 87px)，最低 650px。顶部状态栏与 App 导航固定。建议页顶部歌曲信息和波形不随建议列表滚动，底部重新生成按钮固定；结果内容独立滚动。

## Elevation & Depth

App 面板采用色阶分层，不叠加卡片阴影。只有设备外框使用 `0 24px 70px #080a0f66` 阴影；编辑弹窗通过 `#000b` 遮罩隔离背景。

## Shapes

建议卡片 11px 圆角，结果主面板 14px，文字弹窗 18px。设备外框和屏幕分别为 37px、29px 圆角，属于演示包装。图标为同一套线宽 1.8 的 SVG，波形用 SVG 几何图形展示。

## Components

- **详情页**：生日封面缩小为 260px 并居中，歌名在下方居中展示；保留原有操作和播放区，新增评分建议入口。
- **评分**：只显示“76分”，不展示满分分母或下方说明标签。
- **建议卡片**：全局和局部分区，每条包含简短文字及修改、勾选、删除入口。局部选中使用浅色细轮廓与较亮背景；勾选用独立复选框表示。
- **波形**：灰色波形、灰色两端手柄、白色游标。下方依次显示范围起点、游标时间、范围终点；未选中时范围显示为占位值。本阶段范围位置只是静态示意，时间尚未对应真实音频。
- **文字弹窗**：两类建议共用；浅蓝底、文本输入框、白色取消与深色保存按钮。实现焦点循环与 Escape 关闭；保存当前只关闭弹窗，不写回文字。
- **重新生成**：未勾选时深灰置灰；勾选后显示浅色按钮。进入等待页后五秒自动跳至完成页；切换页面时清除旧计时器。
- **生成等待页**：参照新截图，深蓝背景和底部淡紫光晕的 4:3 面板，居中显示“创作中..”和等待文案；下方沿用结果页操作和灵感参考布局。
- **结果页**：两首作品并排，保留再次编辑、创作新歌及灵感参考外观。不提供原版切换或修改要求回看。
- **反馈状态**：按钮使用 130ms ease-out 颜色变化；键盘焦点为 2px 浅蓝轮廓。减弱动态偏好会关闭过渡。

## Do's and Don'ts

- Do 延续用户截图的视觉世界和后续确认的简短文案。
- Do 区分局部建议选中状态与采纳勾选状态。
- Do 在 App 外说明静态阶段和模拟边界。
- Don't 宣称当前已支持音频试听、范围拖动或完整编辑。
- Don't 增加手机适配、结果对比和复杂版本管理。
