# weblate-tool

weblate 上传下载脚本

### 使用方法

#### 上传

`npx weblate-tool-upload -p [./translations/locales]`

#### 下载

> 先确保本地已跑出翻译文件如 en.json,脚本是根据本地文件去 weblate 拉取文件来更新

`npx weblate-tool-fetch -p [./translations/locales]`
