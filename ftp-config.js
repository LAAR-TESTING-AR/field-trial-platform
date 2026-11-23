(function () {
  "use strict";

  const FLOW_URLS = Object.freeze({
    validateUser: "https://d59e7251f125ea8db6dba166e9e0fe.e2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/31/workflows/abdd40febb9142d0ae4b3e81cfe6bcc6/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MFLpu2HG5DdLVa0hEH4eJ72uPZQjZf3jO4rKh9iKIUI",
    plantingDate: "https://d59e7251f125ea8db6dba166e9e0fe.e2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/20/workflows/8cb7feb5ec2a46a28d5c8d7dbb2acd4a/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=UelEfPzAWKRhm-ik3WlImcbcbhulwP8yBiVDQiraAZc",
    plantingStatus: "https://d59e7251f125ea8db6dba166e9e0fe.e2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/02/workflows/a43d2457b058477daf00def0e48d1dc2/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=6-8f0tavSfjaRR8_-lsckwdh2nOYhrKzwV3V-Z0wf0I",
    harvestingDate: "https://d59e7251f125ea8db6dba166e9e0fe.e2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/02/workflows/1c92da44272b4c2a8a3dd0c961a0dde5/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=wCDk-2CQq-6BJ2aJCWuPhBBUx4A9s8Bkt8nTsPUBwO0",
    harvestingStatus: "https://d59e7251f125ea8db6dba166e9e0fe.e2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/18/workflows/8acd73c5ca4b425db78215f3056c820a/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=13ntIDcZG6UPcGHjt-EtKmZjUF5_QJwiXBSaHnP2QYI",
    planningCreate: "https://d59e7251f125ea8db6dba166e9e0fe.e2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/18/workflows/546fdcdaea88447bae329715a0451940/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=_VbpcIOJlOKBwMhhBSAVufZb0EEZMVTbZ7c0om_3150",
    planningGet: "https://d59e7251f125ea8db6dba166e9e0fe.e2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/12/workflows/76a5bae973bc4989a6177f314746c897/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=lk93WPXZSAAc6m-Xn9wim0Ct7DNTWQMGYiO7MTvLZI8",
    planningUpdate: "https://d59e7251f125ea8db6dba166e9e0fe.e2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/18/workflows/3fde3339ccb441afab9e71a66cf590e1/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=b1PNHjS-zFGgHMI6wBY427Hlso8uywPfBUUaiNQ1VxQ",
    planningDelete: "https://d59e7251f125ea8db6dba166e9e0fe.e2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/08/workflows/fd95fcd010b6445abbd5069290c04743/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=uOx-ZsjXKcXD4NNJIxuXIHbezNv5mHzYfTxZy0F_WM0",
    fieldPhotoUpdateComment: "https://d59e7251f125ea8db6dba166e9e0fe.e2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/27/workflows/79368205893545f293ec007f0edb0b09/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=rZ_afYUMaPHRHLzfQRXwkPR-pOh4JsNdI8gAwP4V-VA",
    fieldCoordinateSync: "https://d59e7251f125ea8db6dba166e9e0fe.e2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/01/workflows/5333e46ac57746ec99ac8ac5b65d9558/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=l2QyxwVllrZNVV3wyd-VlHm83Dzs6uLIL6_fN3Chat0",
    fieldPhotoSync: "https://d59e7251f125ea8db6dba166e9e0fe.e2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/03/workflows/4dce494347f74b7d90893f0888e48d54/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=llvxFD-Tt4ZYIuDDanapWR3l8plxbpBXIrjMCkYVYFA"
  });

  function getFlowUrl(name) {
    const url = FLOW_URLS[name];
    if (typeof url !== "string" || !/^https:\/\//i.test(url)) {
      throw new Error(`FTP_CONFIG: endpoint no configurado o invalido: ${name}`);
    }
    return url;
  }

  window.FTP_CONFIG = Object.freeze({
    environment: "PROD",
    version: "1.0.0",
    flows: FLOW_URLS,
    getFlowUrl: getFlowUrl
  });
})();
