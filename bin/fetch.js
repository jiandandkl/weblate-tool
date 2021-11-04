#!/usr/bin/env node
const path = require("path");
const program = require("commander");
const axios = require("axios");
const fsExtra = require("fs-extra");
const ora = require("ora");

const cwd = process.cwd();
program
  .option("-p, --path <path>", "翻译文件的路径")
  .option("-o, --organization <organization>", "所属组织")
  .parse(process.argv);

const axiosBase = axios.create({
  baseURL: "http://xxx/api/",
  headers: {
    "Content-Type": "application/json",
  },
});

async function intlFetch() {
  let { path: programPath, organization } = program.opts();
  if (!organization) {
    // 默认为xxx项目
    organization = "xxx";
  }
  // 获取当前项目名作为weblate的组件名
  const componentName = cwd.split(/[\\/]/).pop();

  const loading = ora("匹配路径下文件");
  if (!programPath) {
    loading.fail("请添加路径参数, 如 npx weblate-tool-fetch -p ./translations");
  } else {
    const outputPath = path.resolve(cwd, programPath);
    // 拿到路径下的所有文件名
    try {
      loading.start();
      const fileList = await fsExtra.readdirSync(outputPath);
      loading.info("读取成功,正在拉取weblate文件...");
      if (fileList.length === 0) {
        loading.fail(
          `未检测到${programPath}中文件,请先执行react-intl相关命令收集文案`
        );
      } else {
        fileList.forEach(async (file) => {
          let [initFileName] = file.split(".");
          let originFileName = initFileName;
          // 处理react-intl跑出来的白名单文件
          if (initFileName.indexOf("whitelist") > -1) {
            return;
          }
          if (initFileName.indexOf("zh") > -1) {
            originFileName = "zh_Hans";
          }
          let res;
          try {
            res = await axiosBase(
              `translations/${organization}/${componentName}/${originFileName}/file/`
            );
          } catch (error) {
            loading.fail(`${initFileName}拉取失败`);
          }
          await fsExtra.outputFileSync(
            `${outputPath}/${initFileName}.json`,
            JSON.stringify(res.data, null, 2),
            "utf8"
          );
        });
        loading.succeed(`拉取成功,请移步${programPath}查看文件`);
      }
    } catch (error) {
      loading.fail(`error: ${error}`);
    }
  }
}

intlFetch();
