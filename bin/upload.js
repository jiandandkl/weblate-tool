#!/usr/bin/env node
const path = require("path");
const program = require("commander");
const axios = require("axios");
const fsExtra = require("fs-extra");
const FormData = require("form-data");
const ora = require("ora");

const cwd = process.cwd();
program
  .option("-p, --path <path>", "翻译文件的路径")
  .option("-o, --organization <organization>", "所属组织")
  .parse(process.argv);

const axiosBase = axios.create({
  baseURL: "http://xxx/api/",
  headers: {
    "Content-Disposition": "attachment",
    "Content-Type": "multipart/form-data",
    Authorization: "Token xxx",
  },
});

async function intlUpload() {
  let { path: programPath, organization } = program.opts();
  if (!organization) {
    // 默认为xx项目
    organization = "xx";
  }
  // 获取当前项目名
  const componentName = cwd.split(/[\\/]/).pop();
  if (!programPath) {
    loading.fail(
      "请添加路径参数, 如 npx weblate-tool-upload -p ./translations"
    );
  } else {
    // 若没有组织就创建
    const isHaveOrg = await haveOrg(organization);
    if (!isHaveOrg) {
      await createOrg(organization);
      await haveComponent(organization, componentName);
    } else {
      const isHaveComponent = await haveComponent(organization, componentName);
      if (!isHaveComponent) {
        // todo 创建有点问题
        // await createComponent(organization, componentName);
        ora(`error: 请先在weblate创建${componentName}同名组件`).fail();
        return;
      }
    }
    let uploadPath = path.resolve(cwd, programPath);

    const files = fsExtra.readdirSync(uploadPath);
    const uploadOra = ora(`已获取翻译文件,开始上传...`).start();
    await Promise.all(
      files.map((fileName) =>
        uploadWeblate({
          fileName,
          uploadPath,
          uploadOra,
          organization,
          componentName,
        })
      )
    );
  }
}

async function uploadWeblate({
  fileName,
  uploadPath,
  uploadOra,
  organization,
  componentName,
}) {
  let fileLang = fileName.split(".")[0];
  // weblate上简体中文为zh_Hans
  if (fileLang === "zh") {
    fileLang = "zh_Hans";
  }
  const file = fsExtra.createReadStream(`${uploadPath}/${fileName}`);

  let formData = new FormData();
  formData.append("method", "replace");
  formData.append("file", file);
  formData.append("filename", fileName);
  const headers = formData.getHeaders();

  try {
    const res = await axiosBase.post(
      `translations/${organization}/${componentName}/${fileLang}/file/`,
      formData,
      { headers }
    );
    if (res.status === 200) {
      uploadOra.succeed(`${fileName}上传成功`);
    }
  } catch (error) {
    if (String(error) === "Error: Request failed with status code 404") {
      uploadOra.fail(`${fileName}上传失败: 请先在weblate创建${fileLang}的翻译`);
    } else {
      uploadOra.fail(`${fileName}上传失败:${error}`);
    }
  }
}

// 判断组织是否存在
async function haveOrg(organization) {
  const res = await axiosBase("projects/");
  const orgs = res.data.results.map((item) => item.name);
  return orgs.includes(organization);
}

// 创建组织
async function createOrg(organization) {
  let formData = new FormData();
  formData.append("name", organization);
  formData.append("slug", organization);
  formData.append("web", "xxx");
  const headers = formData.getHeaders();
  await axiosBase.post("projects/", formData, { headers });
}

// 判断组件是否存在
async function haveComponent(organization, componentName) {
  const res = await axiosBase(`projects/${organization}/components/`);
  const components = res.data.results.map((item) => item.name);
  return components.includes(componentName);
}

// 创建组件
async function createComponent(organization, componentName) {
  let formData = new FormData();
  formData.append("name", componentName);
  formData.append("slug", componentName);
  formData.append("new_lang", "add");
  formData.append("file_format", "json");
  formData.append("filemask", "langs/*.json");
  formData.append("repo", "file:///Users");
  const headers = formData.getHeaders();
  try {
    const res = await axiosBase.post(
      `projects/${organization}/components/`,
      formData,
      { headers }
    );
    console.log(122, res);
  } catch (error) {
    console.log(124, error.response.data);
  }
}

intlUpload();
