import { PAGINATIONS } from "@/config/constans";
import { useEffect, useState } from "react";



interface UseEntitySearchProps<T extends {
    search: string;
    page: number;
}> {
    params: T;
    setParams: (params: T) => unknown;
    debounceMs?: number;
}

export function useEntitySearch<T extends {
    search: string;
    page: number;

}>({
    params,
    setParams,
    debounceMs = 500,
}: UseEntitySearchProps<T>) {

    const [localSearch, setLocalSearch] = useState(params.search);

    useEffect(() => {
        if (localSearch === "" && params.search !== "") {
            setParams({ ...params, search: "", page: PAGINATIONS.DEFAULT_PAGE });
            return;
        }

        const timer = setTimeout(() => {
            if (localSearch !== params.search) {
                setParams({
                    ...params,
                    search: localSearch,
                    page: PAGINATIONS.DEFAULT_PAGE,
                })
            }
        }
    , debounceMs);
    return () => clearTimeout(timer);
    }, [params, localSearch, debounceMs, setParams]);


    useEffect(() => {
        setLocalSearch(params.search);
    }, [params.search]);

    return {
       searchValue: localSearch,
       onSearchChange: setLocalSearch,
    }

}