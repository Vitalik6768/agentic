import {parseAsInteger, parseAsString} from "nuqs/server";
import {PAGINATIONS} from "@/config/constans";


export const executionsParams = {
    page: parseAsInteger
    .withDefault(PAGINATIONS.DEFAULT_PAGE)
    .withOptions({ clearOnDefault: true }),
    pageSize: parseAsInteger
    .withDefault(PAGINATIONS.DEFAULT_PAGE_SIZE)
    .withOptions({ clearOnDefault: true }),

}