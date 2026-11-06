import type { SystemType } from "./systemTypesData";

export interface SystemConfig {
  software: "Yes" | "No" | "Report Generation Only";
  lvTrolley: "Automatic" | "Manual";
  contentDir: "advanced" | "fullyAutomatic" | "semiAutomatic" | "conventional";
  defaultTests: string[];
  defaultInstruments: string[];
  defaultEquipment: string[];
  defaultSubsystems: string[];
  defaultProprietary: string[];
}

export const systemConfiguration: Record<SystemType, SystemConfig> = {
  Advanced: {
    software: "Yes", lvTrolley: "Automatic", contentDir: "advanced",
    defaultTests: ["winding-resistance","voltage-ratio","vector-group","no-load","mag-balance","short-circuit","ir-pi","av","ivw","oltc","core-frame","leak","415v-method","temp-rise","li","zero-seq","harmonic","ivpd"],
    defaultInstruments: ["power-analyzer","vrm","wrm","irm","li-tester","pd-meter"],
    defaultEquipment: ["ht-cap","mg-set","ct-1","pt-1","hv-trans","booster","gen-panel"],
    defaultSubsystems: ["control-desk","power-panel","scada","plc","hv-switching","ct-pt-rack","lv-trolley","safety","busbar","cable-mgmt","report-sw"],
    defaultProprietary: ["test-bench","power-panel","lv-trolley","report-sw","commissioning","training","documentation"],
  },
  FullyAutomatic: {
    software: "Yes", lvTrolley: "Automatic", contentDir: "fullyAutomatic",
    defaultTests: ["winding-resistance","voltage-ratio","vector-group","no-load","short-circuit","ir-pi","av","ivw","oltc","temp-rise","li","ivpd"],
    defaultInstruments: ["power-analyzer","vrm","wrm","irm","li-tester","pd-meter"],
    defaultEquipment: ["ht-cap","mg-set","ct-1","pt-1","hv-trans","booster","gen-panel"],
    defaultSubsystems: ["control-desk","power-panel","scada","plc","hv-switching","ct-pt-rack","lv-trolley","safety","report-sw"],
    defaultProprietary: ["test-bench","power-panel","lv-trolley","report-sw","commissioning","training","documentation"],
  },
  SemiAutomatic: {
    software: "Report Generation Only", lvTrolley: "Manual", contentDir: "semiAutomatic",
    defaultTests: ["winding-resistance","voltage-ratio","vector-group","no-load","short-circuit","ir-pi","av","ivw","temp-rise","li"],
    defaultInstruments: ["power-analyzer","vrm","wrm","irm","li-tester"],
    defaultEquipment: ["ht-cap","mg-set","ct-1","pt-1","hv-trans","booster"],
    defaultSubsystems: ["control-desk","power-panel","hv-switching","ct-pt-rack","safety","report-sw"],
    defaultProprietary: ["test-bench","power-panel","report-sw","commissioning","training","documentation"],
  },
  Conventional: {
    software: "No", lvTrolley: "Manual", contentDir: "conventional",
    defaultTests: ["winding-resistance","voltage-ratio","vector-group","no-load","short-circuit","ir-pi","av","ivw","temp-rise"],
    defaultInstruments: ["power-analyzer","vrm","wrm","irm"],
    defaultEquipment: ["ht-cap","mg-set","ct-1","pt-1","hv-trans"],
    defaultSubsystems: ["control-desk","power-panel","hv-switching","ct-pt-rack","safety"],
    defaultProprietary: ["test-bench","power-panel","commissioning","training","documentation"],
  },
};
