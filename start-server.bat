@echo off
rem 关闭命令回显，窗口只显示提示和执行结果。

rem 本脚本设置的环境变量只在本次执行期间生效。
setlocal

rem 切换到此 bat 文件所在目录；/d 允许同时切换盘符。
cd /d "%~dp0"

rem 检查能否找到 Node.js，隐藏正常和错误输出；此处不检查版本。
where node >nul 2>nul
rem 上一步失败时显示安装提示，等待按键并结束脚本。
if errorlevel 1 (
  echo Please install Node.js 24 LTS first.
  pause
  exit /b 1
)
rem 仅在依赖目录不存在时安装；更新依赖后需手动执行 npm install。
if not exist node_modules (
  rem call 使 npm 命令执行结束后继续本脚本；失败则退出。
  call npm install
  if errorlevel 1 exit /b 1
)

rem 初始化数据库表和默认窗口，保留已有号码及窗口数据。
rem 后续 errorlevel 判断用于在命令失败时停止，避免继续启动。
call npm run db:init
if errorlevel 1 exit /b 1

rem 缺少 Vite 构建页面时执行构建；修改源码后需手动执行 npm run build。
if not exist dist\index.html (
  call npm run build
  if errorlevel 1 exit /b 1
)

rem 启动生产服务器；保持窗口运行，按 Ctrl+C 停止。
call npm run start
