import { decorate, injectable, METADATA_KEY as inversify_METADATA_KEY } from 'inversify';
import { METADATA_KEY } from '../constants/constants';
import { ConfigObjectMetadata, DecoratorObjectBinderSettings } from '../interfaces/interfaces';

export function config(settings?: DecoratorObjectBinderSettings) {
    return function _config(target: any) {
        getConfigMetadata().push({
            implementationType: target,
            settings
        });

        const isAlreadyDecorated = Reflect.hasOwnMetadata(inversify_METADATA_KEY.PARAM_TYPES, target);

        if (!isAlreadyDecorated) {
            console.log('decorating');
            decorate(injectable(), target);
        }

        return target;
    };
}

function getConfigMetadata(): ConfigObjectMetadata[] {
    let metadataList: ConfigObjectMetadata[] = Reflect.getMetadata(METADATA_KEY.configObject, Reflect);
    if (!metadataList) {
        metadataList = [];
        Reflect.defineMetadata(METADATA_KEY.configObject, metadataList, Reflect);
    }
    return metadataList;
}
