import {parseAsInteger, parseAsString} from "nuqs/server";
import {PAGINATIONS} from "@/config/constans";


export const credentialsParams = {
    page: parseAsInteger
    .withDefault(PAGINATIONS.DEFAULT_PAGE)
    .withOptions({ clearOnDefault: true }),
    pageSize: parseAsInteger
    .withDefault(PAGINATIONS.DEFAULT_PAGE_SIZE),
    search: parseAsString
    .withDefault("")
    .withOptions({ clearOnDefault: true }),
}