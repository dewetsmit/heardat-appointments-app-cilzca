const raw = "{\"gender\":[{\"DateCreated\":\"2019-11-16T19:38:03\",\"DateModified\":\"2026-05-07T04:58:26.2640919+02:00\",\"Active\":1,\"Deleted\":0,\"Gender\":0,\"GenderID\":0,\"Print\":0,\"Selected\":0,\"Name\":\"Female\"}]}";
let data;
try {
  data = JSON.parse(raw);
} catch(e) {
  data = raw;
}
console.log("data type:", typeof data);
let parsedData = typeof data === 'string' ? JSON.parse(data) : data;
console.log("parsedData type:", typeof parsedData);
const expectedKeys = ['genders', 'gender'];
let result = [];
if (Array.isArray(parsedData)) result = parsedData;
else if (typeof parsedData === 'object') {
  for (const key of expectedKeys) {
    if (parsedData[key] && Array.isArray(parsedData[key])) {
      result = parsedData[key];
      break;
    }
  }
}
console.log("result Array?", Array.isArray(result));
